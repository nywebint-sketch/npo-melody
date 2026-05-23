// Copied from original script.js with no behavior changes.

import { createCarousel } from "./carousel.js";
import { ASSET_PREFIX, HERO_PRINT_URL, getDefaultLogoUrl } from "./logoUrls.js";

// Заглушка «логотип»: в БД может храниться sentinel `logo.png` — в UI подставляется theme-aware URL (см. logoUrls.js).

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const pad2 = (n) => String(n).padStart(2, "0");

const monthsRu = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const fmtDT = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const fmtDateShort = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${monthsRu[d.getMonth()]}`;
};

const fmtDateDots = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
};

const recordsCountRu = (n) => {
  const num = Number(n);
  const x = Math.abs(num) % 100;
  const d = x % 10;
  if (x > 10 && x < 20) return `${num} записей`;
  if (d === 1) return `${num} запись`;
  if (d >= 2 && d <= 4) return `${num} записи`;
  return `${num} записей`;
};

const sortAsc = (arr, key) => [...arr].sort((a, b) => new Date(a[key]) - new Date(b[key]));

let data = {
  events: [],
  releases: [],
  podcasts: [],
  merch: [],
  live: []
};

let clubSession = null;
let dbNoticeNode = null;
let dbRetryButtonNode = null;
let isDbRetryInProgress = false;

const getOrCreateDbNoticeNode = () => {
  if (dbNoticeNode && document.body.contains(dbNoticeNode)) return dbNoticeNode;
  const main = document.querySelector("main");
  if (!main) return null;
  const wrap = document.createElement("div");
  wrap.className = "container db-notice-wrap";
  const notice = document.createElement("div");
  notice.id = "dbNotice";
  notice.className = "card pad db-notice";
  notice.hidden = true;
  const text = document.createElement("div");
  text.className = "db-notice-text";
  const actions = document.createElement("div");
  actions.className = "db-notice-actions";
  const retryBtn = document.createElement("button");
  retryBtn.type = "button";
  retryBtn.className = "btn db-notice-retry";
  retryBtn.textContent = "Повторить попытку";
  retryBtn.addEventListener("click", async () => {
    if (isDbRetryInProgress) return;
    isDbRetryInProgress = true;
    retryBtn.disabled = true;
    retryBtn.textContent = "Пробуем...";
    try {
      renderSkeletonGrid("#eventsGrid", 6);
      renderSkeletonGrid("#releasesGrid", 4);
      renderSkeletonGrid("#streamsLiveList", 4, "row");
      renderSkeletonGrid("#merchGrid", 4);
      await loadCatalogFromDb();
      renderEvents();
      renderReleases();
      renderStreams();
      renderMerch();
    } finally {
      isDbRetryInProgress = false;
      retryBtn.disabled = false;
      retryBtn.textContent = "Повторить попытку";
    }
  });
  actions.appendChild(retryBtn);
  notice.appendChild(text);
  notice.appendChild(actions);
  wrap.appendChild(notice);
  main.prepend(wrap);
  dbNoticeNode = notice;
  dbRetryButtonNode = retryBtn;
  return notice;
};

const setDbNotice = (health) => {
  const notice = getOrCreateDbNoticeNode();
  if (!notice) return;
  const textNode = notice.querySelector(".db-notice-text");
  if (!health?.hasNetworkIssue) {
    notice.hidden = true;
    if (textNode) textNode.textContent = "";
    return;
  }
  notice.hidden = false;
  if (textNode) {
    textNode.textContent = "Нет соединения с Supabase. Проверьте DNS/интернет. Можно нажать «Повторить попытку» без перезагрузки страницы.";
  }
  if (dbRetryButtonNode) {
    dbRetryButtonNode.disabled = isDbRetryInProgress;
  }
};

const streamsAuthOk = () => Boolean(clubSession?.email);

const BOOKING_ADMIN_ENDPOINT = "https://httpbin.org/post";
const BOOKING_COOLDOWN_MS = 60 * 1000;
const BOOKING_MIN_FILL_MS = 3000;
const BOOKING_REQUEST_TIMEOUT_MS = 12000;
const BOOKING_KEY = "npo_booking_last_submit_ts";
const CLUB_TOKEN_KEY = "npo_club_token_v1";
const CLUB_API_BASE = window.location.protocol === "file:" ? "http://localhost:8000" : "";
const el = (tag, { className, text } = {}) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const safeHttpUrl = (value) => {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};

/** Убирает кавычки/невидимые символы; добавляет https:// для youtu.be и youtube.com без схемы */
const normalizeStreamUrlInput = (raw) => {
  let s = String(raw ?? "").trim();
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");
  s = s.replace(/^['"\u201C\u201D\u201E\u00AB\u00BB]+|['"\u201C\u201D\u201E\u00AB\u00BB]+$/g, "");
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (/^(youtu\.be\/|(?:www\.)?youtube\.com\/|m\.youtube\.com\/)/i.test(s)) {
    return `https://${s}`;
  }
  return s;
};

/** Ссылка на видео/трансляцию для блока Live (Supabase: stream_url и др.) */
const getEventStreamUrl = (eventItem) => {
  if (!eventItem) return "";
  const raw =
    eventItem.stream_url ||
    eventItem.streamUrl ||
    eventItem.video_url ||
    eventItem.videoUrl ||
    eventItem.live_url ||
    eventItem.liveUrl ||
    eventItem.embed_url ||
    eventItem.embedUrl ||
    "";
  return safeHttpUrl(normalizeStreamUrlInput(raw));
};

const STREAM_VIDEO_EXT = /\.(mp4|webm|ogg)(\?|$)/i;

/** Преобразует публичную ссылку в iframe-embed или прямой URL для HTML5 video */
const streamUrlToEmbed = (href) => {
  const normalized = normalizeStreamUrlInput(href);
  if (!normalized) return { kind: "none", embed: "", video: "" };
  try {
    const u = new URL(normalized);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const seg = u.pathname.replace(/^\//, "").split("/").filter(Boolean)[0] || "";
      const id = decodeURIComponent(seg).replace(/\/$/, "");
      if (id) return { kind: "iframe", embed: `https://www.youtube.com/embed/${encodeURIComponent(id)}`, video: "" };
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "m.youtube.com") {
      if (u.pathname.startsWith("/embed/")) return { kind: "iframe", embed: u.href.split(/[?#]/)[0], video: "" };
      const v = u.searchParams.get("v");
      if (v) return { kind: "iframe", embed: `https://www.youtube.com/embed/${encodeURIComponent(v)}`, video: "" };
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts) return { kind: "iframe", embed: `https://www.youtube.com/embed/${encodeURIComponent(shorts[1])}`, video: "" };
    }
    if (host.endsWith("vimeo.com")) {
      const m = u.pathname.match(/\/(\d+)/);
      if (m) return { kind: "iframe", embed: `https://player.vimeo.com/video/${m[1]}`, video: "" };
    }
    if (host.endsWith("rutube.ru")) {
      const m = u.pathname.match(/\/video\/([a-f0-9]{32})/i);
      if (m) return { kind: "iframe", embed: `https://rutube.ru/play/embed/${m[1]}`, video: "" };
    }

    if (STREAM_VIDEO_EXT.test(u.pathname) || STREAM_VIDEO_EXT.test(normalized)) {
      return { kind: "video", embed: "", video: normalized };
    }

    if (/\/embed\//i.test(u.pathname) || host.startsWith("player.")) {
      return { kind: "iframe", embed: normalized, video: "" };
    }

    return { kind: "none", embed: "", video: "" };
  } catch {
    return { kind: "none", embed: "", video: "" };
  }
};

const createTag = (text) => el("span", { className: "tag", text: String(text || "").trim() || "—" });

const readClubToken = () => localStorage.getItem(CLUB_TOKEN_KEY) || "";
const saveClubToken = (token) => {
  if (!token) {
    localStorage.removeItem(CLUB_TOKEN_KEY);
    return;
  }
  localStorage.setItem(CLUB_TOKEN_KEY, token);
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const clubApiUrl = (path) => `${CLUB_API_BASE}${path}`;

const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const clubRequest = async (path, { method = "GET", body = null, auth = true } = {}) => {
  const headers = { "Content-Type": "application/json" };
  const token = readClubToken();
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(clubApiUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Ошибка запроса";
    throw new Error(message);
  }
  return payload || {};
};

function renderExclusiveItems(items = []) {
  const exclusiveContent = $("#exclusiveContent");
  if (!exclusiveContent) return;
  exclusiveContent.replaceChildren();

  items.forEach((item) => {
    const card = el("div", { className: "card pad" });
    card.appendChild(el("b", { text: item.title || "Эксклюзив" }));
    const desc = el("div", { className: "muted", text: item.description || "" });
    desc.style.marginTop = "6px";
    card.appendChild(desc);
    exclusiveContent.appendChild(card);
  });
}

function renderClubAccess() {
  const authGuest = $("#authGuest");
  const authMember = $("#authMember");
  const memberName = $("#memberName");
  const authStatus = $("#authStatus");
  const exclusiveContent = $("#exclusiveContent");
  const exclusiveSection = $("#exclusive");

  const userIsAuthenticated = Boolean(clubSession?.email);

  if (authGuest) authGuest.style.display = userIsAuthenticated ? "none" : "grid";
  if (authMember) authMember.style.display = userIsAuthenticated ? "block" : "none";
  if (memberName) memberName.textContent = clubSession?.name || clubSession?.email || "участник";

  /* Раздел «Эксклюзив» временно скрыт на сайте; контент для модалки профиля по-прежнему заполняется при входе. */
  if (exclusiveSection) exclusiveSection.setAttribute("hidden", "");
  if (exclusiveContent) exclusiveContent.style.display = userIsAuthenticated ? "" : "none";

  if (authStatus) {
    authStatus.textContent = userIsAuthenticated
      ? ""
      : "Доступ к эксклюзиву закрыт.";
  }

  // When authenticated: hide profile section from page (no scroll); content only in modal
  // Секция авторизации/регистрации не в прокрутке — только модалка по кнопке «Вход»
  const profileSection = document.getElementById("profile");
  if (profileSection) {
    profileSection.style.display = "none";
  }

  // При отсутствии авторизации: только «Вход», кнопка с картинкой профиля скрыта. При авторизации — наоборот.
  const loginForms = $$(".login-form, .register-form");
  const loginRegisterButtons = $$(".login-register-buttons");
  const profileButtons = $$(".profile-button");
  const authOpenButtons = $$(".auth-open-button");

  loginForms.forEach((el) => { el.style.display = userIsAuthenticated ? "none" : ""; });
  loginRegisterButtons.forEach((el) => { el.style.display = userIsAuthenticated ? "none" : "grid"; });

  authOpenButtons.forEach((el) => {
    el.style.display = userIsAuthenticated ? "none" : "";
    if (userIsAuthenticated) el.setAttribute("hidden", "");
    else el.removeAttribute("hidden");
  });
  profileButtons.forEach((el) => {
    el.style.display = userIsAuthenticated ? "" : "none";
    if (userIsAuthenticated) {
      el.removeAttribute("hidden");
    } else {
      el.setAttribute("hidden", "");
    }
  });

  $$(".nav-club-logout").forEach((el) => {
    el.style.display = userIsAuthenticated ? "" : "none";
    if (userIsAuthenticated) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  });
}

function setClubStatus(message) {
  const authStatus = $("#authStatus");
  if (authStatus && message) authStatus.textContent = message;
}

async function refreshClubSession() {
  try {
    const session = await window.dbLayer.getSession();
    if (!session) {
      clubSession = null;
      renderClubAccess();
      return;
    }

    clubSession = {
      email: session.user.email,
      name: session.user.user_metadata?.name || session.user.email
    };

    // Тут можно в будущем брать эксклюзивный контент из базы
    const mockExclusive = [
      { title: 'Early Access: NPO VA 002', description: 'Превью треков + закрытый pre-save.' },
      { title: 'Private Stream Archive', description: 'Закрытые записи из ночных сетов.' },
      { title: 'Members Promo Code', description: 'Скидка 15% в магазине и на закрытые дропы.' }
    ];
    renderExclusiveItems(mockExclusive);
    renderClubAccess();
  } catch (err) {
    console.error(err);
    clubSession = null;
    renderClubAccess();
  }
}

function initClubAuth() {
  const registerForm = $("#registerForm");
  const loginForm = $("#loginForm");
  const logoutBtn = $("#logoutBtn");

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = String(form.elements.name?.value || "").trim();
    const email = normalizeEmail(form.elements.email?.value);
    const password = String(form.elements.password?.value || "");
    const password2 = String(form.elements.password2?.value || "");

    if (!name || name.length < 2) {
      setClubStatus("Имя должно быть не короче 2 символов.");
      return;
    }
    if (!isValidEmail(email)) {
      setClubStatus("Укажи корректный email.");
      return;
    }
    if (password.length < 6) {
      setClubStatus("Пароль должен быть не короче 6 символов.");
      return;
    }
    if (password !== password2) {
      setClubStatus("Пароли не совпадают.");
      return;
    }

    try {
      await window.dbLayer.register(email, password, name);
      // После регистрации Supabase автоматически логинит, берем сессию
      const session = await window.dbLayer.getSession();
      clubSession = { email: session.user.email, name: session.user.user_metadata?.name || name };
      form.reset();

      const mockExclusive = [
        { title: 'Early Access: NPO VA 002', description: 'Превью треков + закрытый pre-save.' },
        { title: 'Private Stream Archive', description: 'Закрытые записи из ночных сетов.' },
        { title: 'Members Promo Code', description: 'Скидка 15% в магазине и на закрытые дропы.' }
      ];
      renderExclusiveItems(mockExclusive);
      renderStreams();
      renderClubAccess();
      setClubStatus("Регистрация успешна. Эксклюзив открыт.");
      closeModal();
    } catch (err) {
      setClubStatus(err.message || "Ошибка регистрации.");
    }
  });

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = normalizeEmail(form.elements.email?.value);
    const password = String(form.elements.password?.value || "");

    if (!isValidEmail(email) || !password) {
      setClubStatus("Укажи email и пароль.");
      return;
    }

    try {
      await window.dbLayer.login(email, password);
      const session = await window.dbLayer.getSession();
      clubSession = { email: session.user.email, name: session.user.user_metadata?.name || email };
      form.reset();

      const mockExclusive = [
        { title: 'Early Access: NPO VA 002', description: 'Превью треков + закрытый pre-save.' },
        { title: 'Private Stream Archive', description: 'Закрытые записи из ночных сетов.' },
        { title: 'Members Promo Code', description: 'Скидка 15% в магазине и на закрытые дропы.' }
      ];
      renderExclusiveItems(mockExclusive);
      renderStreams();
      renderClubAccess();
      closeModal();
    } catch (err) {
      setClubStatus(err.message || "Неверный email или пароль.");
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    try {
      await window.dbLayer.logout();
    } catch {
      // ignore
    }
    clubSession = null;
    renderStreams();
    closeExclusivePanel();
    renderClubAccess();
    setClubStatus("Ты вышел из аккаунта.");
  });
}

function setupOpenCard(node, type, id) {
  if (!node) return;
  node.classList.add("open-card");
  node.dataset.open = type;
  node.dataset.id = id;
  node.tabIndex = 0;
  node.setAttribute("role", "button");
  node.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      node.click();
    }
  });
}

function createMedia(imgSrc, imgAlt, className = "media") {
  const media = el("div", { className });
  const img = document.createElement("img");

  const defaultLogo = getDefaultLogoUrl();
  const raw = String(imgSrc || "").trim();

  let src;
  if (!raw || raw === "logo.png" || raw === "smile.png") {
    src = defaultLogo;
  } else if (/^https?:\/\//i.test(raw)) {
    src = raw;
  } else if (ASSET_PREFIX) {
    src = ASSET_PREFIX + raw.replace(/^\/+/, "");
  } else {
    src = defaultLogo;
  }

  img.src = src;
  img.alt = imgAlt || "";
  img.loading = "lazy";
  img.decoding = "async";

  // МАГИЯ ЗДЕСЬ: Если картинка (например wei.jpg) вернула 404, ставим заглушку
  img.onerror = function () {
    this.onerror = null; // Защита от бесконечного цикла
    this.src = getDefaultLogoUrl();
  };

  media.appendChild(img);
  return media;
}

function resolveImageSrc(imgSrc) {
  const defaultLogo = getDefaultLogoUrl();
  const raw = String(imgSrc || "").trim();
  if (!raw || raw === "logo.png" || raw === "smile.png") return defaultLogo;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (ASSET_PREFIX) return ASSET_PREFIX + raw.replace(/^\/+/, "");
  return defaultLogo;
}

/** Изображения товаров магазина в Storage: images/microdropych/; короткие имена («vtroem.jpeg», «vtroem») собираем в полный URL. */
function resolveMerchImageSrc(raw) {
  const defaultLogo = getDefaultLogoUrl();
  const s = String(raw || "").trim();
  if (!s || s === "logo.png" || s === "smile.png") return defaultLogo;
  if (/^https?:\/\//i.test(s)) return s;
  if (!/[\\/]/.test(s)) {
    const fn = /\.(jpe?g|png|webp|gif)$/i.test(s) ? s : `${s}.jpeg`;
    return `${ASSET_PREFIX}microdropych/${fn}`;
  }
  return resolveImageSrc(s);
}

function renderEvents() {
  const wrap = $("#eventsGrid");
  if (!wrap) return;

  const sorted = [...data.events].sort((a, b) => b.date.localeCompare(a.date));

  wrap.replaceChildren();

  sorted.forEach((eventItem) => {
    const card = el("div", { className: "card event-card" });
    card.appendChild(createMedia(eventItem.poster || "logo.png", eventItem.title, "media event-media event-poster"));
    const pad = el("div", { className: "pad" });
    pad.appendChild(el("b", { className: "event-card-title", text: eventItem.title }));
    card.appendChild(pad);
    setupOpenCard(card, "event", eventItem.id);
    wrap.appendChild(card);
  });

  if (streamsAuthOk()) renderStreamsLive();
}

function renderReleases() {
  const wrap = $("#releasesGrid");
  if (!wrap) return;
  wrap.replaceChildren();

  [...data.releases].sort((a, b) => b.date.localeCompare(a.date)).forEach((release) => {
    const card = el("div", { className: "card release-card" });
    card.appendChild(createMedia(release.cover || release.poster || release.image || "logo.png", release.title, "media square"));

    const pad = el("div", { className: "pad release-card-body" });
    pad.appendChild(el("b", { className: "release-card-title", text: release.title }));
    pad.appendChild(el("div", { className: "muted release-card-date", text: release.date }));

    card.appendChild(pad);
    setupOpenCard(card, "release", release.id);
    wrap.appendChild(card);
  });
}

function renderStreamsLive() {
  const wrap = $("#streamsLiveList");
  if (!wrap) return;
  wrap.replaceChildren();

  const liveCount = $("#streamsLiveCount");

  if (!streamsAuthOk()) {
    const box = el("div", { className: "pad streams-live-locked" });
    const lead = el("p", {
      className: "streams-live-locked-lead",
      text: "доступно участникам с аккаунтом."
    });
    box.appendChild(lead);
    const btn = el("button", { className: "btn primary auth-open-button", text: "вход / регистрация" });
    btn.type = "button";
    box.appendChild(btn);
    wrap.appendChild(box);
    if (liveCount) liveCount.textContent = "";
    return;
  }

  const now = new Date();
  const upcoming = sortAsc(data.live, "date").filter((e) => new Date(e.date) >= now);

  if (!upcoming.length) {
    const total = data.live.length;
    const emptyText =
      total === 0
        ? "Пока нет эфиров. Добавьте их в админ-панели: раздел «НПО РАДИО» (название, дата в будущем, при необходимости ссылка на трансляцию)."
        : "Нет предстоящих эфиров: все запланированные даты уже в прошлом. Задайте новую дату в админке или добавьте эфир.";
    wrap.appendChild(
      el("div", {
        className: "muted streams-live-empty",
        text: emptyText
      })
    );
    if (liveCount) liveCount.textContent = recordsCountRu(0);
    return;
  }

  upcoming.forEach((eventItem) => {
    const row = el("div", { className: "card pad streams-hint-row" });
    const content = el("div", { className: "row sp" });
    content.appendChild(el("b", { text: eventItem.title }));
    content.appendChild(el("span", { className: "tag", text: "→" }));
    row.appendChild(content);
    setupOpenCard(row, "live-event", eventItem.id);
    wrap.appendChild(row);
  });

  if (liveCount) liveCount.textContent = recordsCountRu(upcoming.length);
}

function renderStreams() {
  const now = new Date();
  const next = sortAsc(data.live, "date").filter((e) => new Date(e.date) >= now)[0];
  const streamNext = $("#streamNext");
  if (streamNext) {
    streamNext.textContent = next ? `Следующий эфир: ${next.title} · ${fmtDT(next.date)}` : "Следующий эфир: —";
  }
  renderStreamsLive();
}

function renderMerch() {
  const wrap = $("#merchGrid");
  if (!wrap) return;
  wrap.replaceChildren();

  data.merch.forEach((item) => {
    const card = el("div", { className: "card event-card" });
    const thumbUrls = getMerchImageUrls(item);
    const posterRaw =
      item.poster != null && String(item.poster).trim() !== ""
        ? String(item.poster).trim()
        : item.image != null && String(item.image).trim() !== ""
          ? String(item.image).trim()
          : null;
    const thumbSrc = posterRaw
      ? resolveMerchImageSrc(posterRaw)
      : (thumbUrls[0] || resolveMerchImageSrc("logo.png"));
    card.appendChild(createMedia(thumbSrc, item.title, "media event-media event-poster"));

    const pad = el("div", { className: "pad" });
    pad.appendChild(el("b", { className: "event-card-title", text: item.title }));
    const priceText = item.price != null && String(item.price).trim() !== "" ? String(item.price).trim() : "";
    if (priceText) {
      pad.appendChild(el("div", { className: "event-card-date", text: priceText }));
    }

    card.appendChild(pad);
    setupOpenCard(card, "merch", item.id);
    wrap.appendChild(card);
  });
}

const modal = $("#modal");
const mTitle = $("#mTitle");
const mSub = $("#mSub");
const mBody = $("#mBody");

const openModal = ({ title, sub, body }) => {
  if (mTitle) mTitle.textContent = title || "—";
  if (mSub) mSub.textContent = sub || "";
  if (mBody) mBody.replaceChildren(body || document.createTextNode(""));
  if (mBody) {
    mBody.scrollTop = 0;
    requestAnimationFrame(() => {
      mBody.scrollTop = 0;
    });
  }
  if (modal) modal.style.display = "flex";
};

const closeModal = () => {
  mBody?.querySelector(".live-modal-iframe")?.setAttribute("src", "");
  mBody?.querySelector(".live-modal-video-file")?.removeAttribute("src");
  if (modal) modal.style.display = "none";
};

const exclusivePanel = $("#exclusivePanel");
const exclusiveHint = $("#exclusiveHint");

function setExclusivePanelOpen(open) {
  if (exclusivePanel) {
    exclusivePanel.hidden = !open;
    exclusivePanel.setAttribute("aria-hidden", open ? "false" : "true");
  }
  if (exclusiveHint) {
    exclusiveHint.hidden = open;
    exclusiveHint.setAttribute("aria-expanded", open ? "true" : "false");
  }
}

function openExclusivePanel() {
  setExclusivePanelOpen(true);
}

function closeExclusivePanel() {
  setExclusivePanelOpen(false);
}

function bindHintPressHandlers(hint) {
  if (!hint) return;
  hint.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      hint.click();
    }
  });
}

/** Верх раздела у верхней границы окна; отступ под фиксированный топбар — в CSS (scroll-margin-top). */
const scrollOptsSectionNav = { behavior: "smooth", block: "start", inline: "nearest" };

function scrollToStreamsSection() {
  document.getElementById("streams")?.scrollIntoView(scrollOptsSectionNav);
  try {
    history.replaceState(null, "", "#streams");
  } catch {
    window.location.hash = "streams";
  }
}

function scrollToExclusiveSection() {
  document.getElementById("exclusive")?.scrollIntoView(scrollOptsSectionNav);
  try {
    history.replaceState(null, "", "#exclusive");
  } catch {
    window.location.hash = "exclusive";
  }
}

/** Клики по пунктам меню: прокрутка к началу раздела без «хвостов» соседних блоков (см. scroll-margin-top в CSS). */
function bindSectionNavScroll() {
  const links = document.querySelectorAll('#mobileMenu a[href^="#"]');
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      if (href === "#profile") return;
      if (href === "#streams") return;
      const id = href.slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView(scrollOptsSectionNav);
      try {
        history.replaceState(null, "", href);
      } catch {
        window.location.hash = href;
      }
    });
  });
}

function bindStreamsSectionPanels() {
  const liveNavLinks = document.querySelectorAll('#mobileMenu a[href="#streams"]');

  $("#exclusiveCloseBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeExclusivePanel();
  });

  bindHintPressHandlers(exclusiveHint);

  liveNavLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToStreamsSection();
    });
  });

  exclusiveHint?.addEventListener("click", (e) => {
    e.preventDefault();
    if (!streamsAuthOk()) return;
    openExclusivePanel();
    scrollToExclusiveSection();
  });
}

const appendDivider = (parent) => parent.appendChild(el("div", { className: "divider" }));

function lineupNamesFromEvent(eventItem) {
  return (Array.isArray(eventItem.lineup) ? eventItem.lineup : []).filter(
    (name) => String(name ?? "").trim() !== ""
  );
}

function buildEventModalRightColumn(
  eventItem,
  { sectionTitle = null, skipLineup = false, lineupChaos = false } = {}
) {
  const right = el("div", { className: "card pad event-modal-right afisha-modal-right" });
  if (sectionTitle) {
    right.appendChild(el("b", { text: sectionTitle }));
    appendDivider(right);
  }
  const aboutText = String(eventItem.about ?? "").trim();
  if (aboutText) {
    right.appendChild(el("div", { className: "muted", text: aboutText }));
  }

  const lineupNames = lineupNamesFromEvent(eventItem);
  if (!skipLineup && lineupNames.length) {
    if (lineupChaos) {
      const chaos = el("div", { className: "muted event-lineup-chaos" });
      chaos.style.marginTop = aboutText ? "8px" : "0";
      chaos.setAttribute("aria-label", "Лайнап");
      lineupNames.forEach((name) => {
        chaos.appendChild(el("span", { className: "event-lineup-chaos-item", text: String(name) }));
      });
      right.appendChild(chaos);
    } else {
      const lineup = el("div", { className: "muted event-lineup" });
      lineup.style.marginTop = aboutText ? "4px" : "0";
      lineupNames.forEach((name) => {
        lineup.appendChild(el("div", { className: "event-lineup-item", text: String(name) }));
      });
      right.appendChild(lineup);
    }
  }

  if (eventItem.address) {
    appendDivider(right);
    right.appendChild(el("b", { text: "Адрес" }));
    const addressEl = el("div", { className: "muted", text: eventItem.address });
    addressEl.style.marginTop = "8px";
    right.appendChild(addressEl);
  }

  return right;
}

function buildEventModalTicketActions(eventItem) {
  // Поддерживаем разные варианты имени поля с ссылкой на билеты,
  // чтобы работать и с camelCase, и с snake_case колонками в Supabase.
  const rawTicketUrl =
    eventItem.ticketUrl ||
    eventItem.ticket_url ||
    eventItem.ticketsUrl ||
    eventItem.tickets_url ||
    eventItem.ticket ||
    eventItem.tickets;
  const ticketUrl = safeHttpUrl(rawTicketUrl);
  const actions = el("div", { className: "event-modal-actions afisha-modal-actions" });
  if (ticketUrl) {
    const link = el("a", { className: "btn primary event-ticket-btn", text: "Билеты / регистрация" });
    link.href = ticketUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    actions.appendChild(link);
  } else {
    const button = el("button", { className: "btn primary event-ticket-btn", text: "Билеты / регистрация" });
    button.type = "button";
    button.addEventListener("click", () => alert("Тут будет ссылка на билеты/регистрацию"));
    actions.appendChild(button);
  }
  return actions;
}

function appendLiveStreamMediaSlot(posterSlot, eventItem) {
  const streamUrl = getEventStreamUrl(eventItem);
  const { kind, embed, video } = streamUrlToEmbed(streamUrl);

  if (kind === "iframe" && embed) {
    const wrap = el("div", { className: "media live-modal-iframe-wrap" });
    const iframe = document.createElement("iframe");
    iframe.className = "live-modal-iframe";
    iframe.src = embed;
    iframe.setAttribute("title", "Трансляция");
    iframe.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
    );
    iframe.setAttribute("allowfullscreen", "");
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    wrap.appendChild(iframe);
    posterSlot.appendChild(wrap);
    return;
  }

  if (kind === "video" && video) {
    const wrap = el("div", { className: "media live-modal-video-file-wrap" });
    const v = document.createElement("video");
    v.className = "live-modal-video-file";
    v.controls = true;
    v.playsInline = true;
    v.setAttribute("preload", "metadata");
    v.src = video;
    wrap.appendChild(v);
    posterSlot.appendChild(wrap);
    return;
  }

  /* Без ссылки на видео — не дублируем «постерную» карточку афиши: слот 16:9 как у плеера */
  const wrap = el("div", { className: "media live-modal-placeholder-wrap" });
  const box = el("div", { className: "live-modal-placeholder" });
  const rawPoster = String(eventItem.poster || "").trim();
  if (rawPoster && rawPoster !== "logo.png" && rawPoster !== "smile.png") {
    const bg = document.createElement("img");
    bg.className = "live-modal-placeholder-bg";
    bg.src = resolveImageSrc(rawPoster);
    bg.alt = "";
    bg.decoding = "async";
    bg.loading = "lazy";
    box.appendChild(bg);
  }
  const cap = el("div", {
    className: "live-modal-placeholder-caption",
    text: "Видео эфира будет здесь"
  });
  box.appendChild(cap);
  wrap.appendChild(box);
  posterSlot.appendChild(wrap);
}

function buildEventModalBody(eventItem) {
  const wrapper = el("div", { className: "event-modal-wrap afisha-modal-wrap" });

  const left = el("div", { className: "card event-modal-left" });
  const posterSlot = el("div", { className: "event-modal-poster-slot" });
  posterSlot.appendChild(createMedia(eventItem.poster || "logo.png", eventItem.title, "media"));
  left.appendChild(posterSlot);

  left.appendChild(buildEventModalTicketActions(eventItem));
  wrapper.appendChild(left);
  wrapper.appendChild(buildEventModalRightColumn(eventItem, { lineupChaos: true }));
  return wrapper;
}

/** Модалка Live: видео/плейсхолдер на всю ширину, описание под ним (без билетов) */
function buildLiveStreamModalBody(eventItem) {
  const wrapper = el("div", {
    className: "event-modal-wrap live-stream-modal-wrap live-stream-modal-stack"
  });

  const mediaWrap = el("div", { className: "live-stream-modal-media" });
  const posterSlot = el("div", { className: "event-modal-poster-slot" });
  appendLiveStreamMediaSlot(posterSlot, eventItem);
  mediaWrap.appendChild(posterSlot);
  wrapper.appendChild(mediaWrap);

  const details = buildEventModalRightColumn(eventItem);
  details.classList.add("live-stream-modal-details");
  wrapper.appendChild(details);
  return wrapper;
}

function buildReleaseModalBody(release) {
  const wrapper = el("div", { className: "event-modal-wrap release-modal-wrap" });

  const left = el("div", { className: "card event-modal-left" });
  const posterSlot = el("div", { className: "event-modal-poster-slot" });
  posterSlot.appendChild(createMedia(release.cover || release.poster || release.image || "logo.png", release.title, "media"));
  left.appendChild(posterSlot);

  const actions = el("div", { className: "event-modal-actions" });

  const bandcamp = el("button", { className: "btn event-ticket-btn", text: "Bandcamp" });
  bandcamp.type = "button";
  bandcamp.addEventListener("click", () => alert("Bandcamp (поставишь ссылку)"));
  actions.appendChild(bandcamp);

  const soundcloud = el("button", { className: "btn event-ticket-btn", text: "SoundCloud" });
  soundcloud.type = "button";
  soundcloud.addEventListener("click", () => alert("SoundCloud (поставишь ссылку)"));
  actions.appendChild(soundcloud);

  left.appendChild(actions);
  wrapper.appendChild(left);
  return wrapper;
}

function getMerchImageUrls(item) {
  let list = item.images;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      list = null;
    }
  }
  if (Array.isArray(list) && list.length > 0) {
    const cleaned = list.map((u) => String(u || "").trim()).filter(Boolean);
    if (cleaned.length) return cleaned.map(resolveMerchImageSrc);
  }
  const single = item.image || item.poster || item.cover || "logo.png";
  return [resolveMerchImageSrc(single)];
}

function buildMerchModalBody(item) {
  const wrapper = el("div", { className: "event-modal-wrap merch-modal-wrap" });

  const left = el("div", { className: "card event-modal-left" });
  const imageUrls = getMerchImageUrls(item);
  const posterSlot = el("div", { className: "event-modal-poster-slot" });
  const carouselContainer = el("div", { className: "merch-modal-carousel-wrap" });
  posterSlot.appendChild(carouselContainer);
  left.appendChild(posterSlot);
  createCarousel(carouselContainer, {
    urls: imageUrls,
    intervalMs: 5000,
    pauseOnHover: true,
    carouselClass: "carousel merch-modal-carousel"
  });

  const right = el("div", { className: "card pad event-modal-right merch-modal-right" });
  // Описание из Supabase: колонка desc или description
  const descText = (item.desc != null && String(item.desc).trim() !== "")
    ? String(item.desc)
    : (item.description != null && String(item.description).trim() !== "")
      ? String(item.description)
      : "Футболки — Марина Бибик, принты — Лофер";
  const desc = el("div", { className: "merch-modal-desc", text: descText });
  right.appendChild(desc);

  const actions = el("div", { className: "event-modal-actions merch-modal-actions" });
  const preorderUrl = (item.preorder_url != null && String(item.preorder_url).trim() !== "")
    ? String(item.preorder_url).trim()
    : (item.preorderUrl != null && String(item.preorderUrl).trim() !== "")
      ? String(item.preorderUrl).trim()
      : "";
  const button = el("button", { className: "btn primary merch-preorder-btn", text: "Предзаказ" });
  button.type = "button";
  if (preorderUrl) {
    button.addEventListener("click", () => window.open(preorderUrl, "_blank", "noopener"));
  } else {
    button.addEventListener("click", () => alert("Тут будет форма/бот"));
  }
  actions.appendChild(button);

  left.appendChild(actions);
  wrapper.appendChild(left);
  wrapper.appendChild(right);
  return wrapper;
}

let authModalContent = null;

function openAuthModal() {
  if (authModalContent == null) {
    const authStatus = $("#authStatus");
    const authGuest = $("#authGuest");
    if (!authGuest) return;
    authModalContent = document.createElement("div");
    authModalContent.className = "auth-modal-content";
    if (authStatus) authModalContent.appendChild(authStatus);
    authModalContent.appendChild(authGuest);
  }
  openModal({ title: "Вход / Регистрация", sub: "", body: authModalContent });
}

const openEventModal = (eventItem) => {
  if (!eventItem) return;
  openModal({
    title: eventItem.title,
    sub: `${fmtDT(eventItem.date)} · ${eventItem.place || "—"}`,
    body: buildEventModalBody(eventItem)
  });
};

const openLiveStreamModal = (eventItem) => {
  if (!eventItem) return;
  openModal({
    title: eventItem.title,
    sub: `${fmtDT(eventItem.date)} · ${eventItem.place || "—"}`,
    body: buildLiveStreamModalBody(eventItem)
  });
};

$("#mClose")?.addEventListener("click", closeModal);
modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// Вход: ссылка «Вход» / кнопки .auth-open-button открывают модалку входа (неавторизованным)
document.addEventListener("click", (e) => {
  const navLogout = e.target.closest(".nav-club-logout");
  if (navLogout) {
    e.preventDefault();
    (async () => {
      try {
        await window.dbLayer.logout();
      } catch {
        // ignore
      }
      clubSession = null;
      renderStreams();
      closeExclusivePanel();
      renderClubAccess();
      setClubStatus("Ты вышел из аккаунта.");
      closeMobileMenu();
    })();
    return;
  }
  const profileLink = e.target.closest("a[href='#profile']");
  if (profileLink && !clubSession) {
    e.preventDefault();
    openAuthModal();
    return;
  }
  const authOpenTrigger = e.target.closest(".auth-open-button");
  if (authOpenTrigger) {
    e.preventDefault();
    openAuthModal();
  }
});

document.addEventListener("click", (e) => {
  const card = e.target.closest("[data-open]");
  if (!card) return;

  const type = card.dataset.open;
  const id = card.dataset.id;

  if (type === "event") {
    openEventModal(data.events.find((x) => x.id === id));
    return;
  }

  if (type === "live-event") {
    const eventItem = data.live.find((x) => String(x.id) === String(id));
    if (eventItem) openLiveStreamModal(eventItem);
    return;
  }

  if (type === "release") {
    const release = data.releases.find((x) => x.id === id);
    if (!release) return;
    openModal({
      title: release.title,
      sub: `${release.date} · ${release.format}`,
      body: buildReleaseModalBody(release)
    });
    return;
  }

  if (type === "podcast") {
    const podcast = data.podcasts.find((x) => x.id === id);
    if (!podcast) return;
    const body = el("div", { className: "grid g2" });
    const left = el("div", { className: "card pad" });
    left.appendChild(el("b", { text: "Плеер" }));
    appendDivider(left);
    left.appendChild(createMedia(podcast.cover || podcast.poster || podcast.image || "logo.png", podcast.title, "media wide"));
    const embedHint = el("div", { className: "muted", text: "Здесь будет SoundCloud embed." });
    embedHint.style.marginTop = "10px";
    left.appendChild(embedHint);

    const right = el("div", { className: "card pad" });
    right.appendChild(el("b", { text: "Описание" }));
    appendDivider(right);
    right.appendChild(el("div", { className: "muted", text: podcast.note || "—" }));
    appendDivider(right);
    right.appendChild(el("b", { text: "Треклист" }));
    const tracks = el("div", { className: "muted", text: "Тест: • Track A • Track B • Track C" });
    tracks.style.marginTop = "8px";
    right.appendChild(tracks);

    body.appendChild(left);
    body.appendChild(right);

    openModal({ title: podcast.title, sub: podcast.date, body });
    return;
  }

  if (type === "merch") {
    const item = data.merch.find((x) => x.id === id);
    if (!item) return;
    openModal({ title: item.title, sub: item.price ? String(item.price) : "", body: buildMerchModalBody(item) });
  }
});

const validateText = (value, { min = 2, max = 120, pattern = null } = {}) => {
  const str = String(value || "").trim();
  if (str.length < min || str.length > max) return false;
  if (str.includes("<") || str.includes(">")) return false;
  if (pattern && !pattern.test(str)) return false;
  return true;
};

const validateBookingPayload = (payload) => {
  if (!validateText(payload.date, { min: 4, max: 40 })) return "Укажи корректную дату";
  if (!validateText(payload.city, { min: 2, max: 80 })) return "Укажи корректный город";
  if (!validateText(payload.venue, { min: 2, max: 120 })) return "Укажи корректную площадку";
  if (!validateText(payload.format, { min: 2, max: 40 })) return "Укажи корректный формат";
  if (!validateText(payload.contacts, { min: 4, max: 120 })) return "Укажи корректные контакты";
  if (!validateText(payload.artistName, { min: 1, max: 80 })) return "Некорректный артист";
  if (payload.note && !validateText(payload.note, { min: 0, max: 500 })) return "Комментарий слишком длинный";
  return "";
};

const getBookingCooldownLeft = () => {
  const last = Number(localStorage.getItem(BOOKING_KEY) || 0);
  if (!last) return 0;
  return Math.max(0, BOOKING_COOLDOWN_MS - (Date.now() - last));
};

document.addEventListener("submit", async (e) => {
  const bookingForm = e.target.closest(".booking-form-modal");
  if (!bookingForm) return;
  e.preventDefault();

  const bookingStatus = $(".booking-status", bookingForm);
  const bookingSubmit = bookingForm.querySelector('button[type="submit"]');

  const endpoint = safeHttpUrl(BOOKING_ADMIN_ENDPOINT);
  if (!endpoint) {
    if (bookingStatus) bookingStatus.textContent = "Ошибка конфигурации endpoint";
    return;
  }

  if (bookingForm.dataset.artistBookable !== "1") {
    if (bookingStatus) bookingStatus.textContent = "Этот артист сейчас не на букинге";
    return;
  }

  const honeypotValue = bookingForm.elements.website?.value?.trim();
  if (honeypotValue) {
    if (bookingStatus) bookingStatus.textContent = "Заявка отклонена";
    return;
  }

  const renderedAt = Number(bookingForm.dataset.renderedAt || 0);
  if (Date.now() - renderedAt < BOOKING_MIN_FILL_MS) {
    if (bookingStatus) bookingStatus.textContent = "Слишком быстро. Проверь форму и отправь снова.";
    return;
  }

  const cooldownLeft = getBookingCooldownLeft();
  if (cooldownLeft > 0) {
    if (bookingStatus) bookingStatus.textContent = `Подожди ${Math.ceil(cooldownLeft / 1000)} сек перед повторной отправкой`;
    return;
  }

  const payload = {
    artistId: bookingForm.dataset.artistId || "",
    artistName: bookingForm.dataset.artistName || "",
    date: bookingForm.elements.date.value.trim(),
    city: bookingForm.elements.city.value.trim(),
    venue: bookingForm.elements.venue.value.trim(),
    format: bookingForm.elements.format.value.trim(),
    contacts: bookingForm.elements.contacts.value.trim(),
    note: bookingForm.elements.note.value.trim(),
    source: "npo-melodiya-site",
    createdAt: new Date().toISOString(),
    userAgent: navigator.userAgent
  };

  const validationError = validateBookingPayload(payload);
  if (validationError) {
    if (bookingStatus) bookingStatus.textContent = validationError;
    return;
  }

  if (bookingStatus) bookingStatus.textContent = "Отправка...";
  if (bookingSubmit) bookingSubmit.disabled = true;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BOOKING_REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    localStorage.setItem(BOOKING_KEY, String(Date.now()));
    if (bookingStatus) bookingStatus.textContent = "Заявка отправлена в админку";
    bookingForm.reset();
    bookingForm.dataset.renderedAt = String(Date.now());
  } catch (err) {
    if (bookingStatus) bookingStatus.textContent = "Ошибка отправки. Попробуй позже.";
    console.error(err);
  } finally {
    clearTimeout(timeout);
    if (bookingSubmit) bookingSubmit.disabled = false;
  }
});

const mobileMenuToggle = $("#mobileMenuToggle");
const mobileMenu = $("#mobileMenu");
const mobileMenuBackdrop = $("#mobileMenuBackdrop");
const mobileLinks = $$("#mobileMenu a");
const mobileBp = window.matchMedia("(max-width: 980px)");
const brandHomeLink = $("#brandHomeLink");

brandHomeLink?.addEventListener("click", (e) => {
  e.preventDefault();
  const next = new URL(brandHomeLink.getAttribute("href") || "./", window.location.href);
  next.hash = "";
  const here = new URL(window.location.href);
  here.hash = "";
  if (String(next.pathname) === String(here.pathname) && String(next.search) === String(here.search)) {
    window.location.reload();
    return;
  }
  window.location.assign(next.href);
});

const closeMobileMenu = () => {
  mobileMenuToggle?.setAttribute("aria-expanded", "false");
  mobileMenuToggle?.setAttribute("aria-label", "Открыть меню");
  if (mobileMenu) mobileMenu.hidden = true;
  if (mobileMenuBackdrop) mobileMenuBackdrop.hidden = true;
  document.body.classList.remove("menu-open");
};

const openMobileMenu = () => {
  document.body.classList.add("menu-open");
  if (mobileMenu) mobileMenu.hidden = false;
  if (mobileMenuBackdrop) mobileMenuBackdrop.hidden = false;
  mobileMenuToggle?.setAttribute("aria-expanded", "true");
  mobileMenuToggle?.setAttribute("aria-label", "Закрыть меню");
};

mobileMenuToggle?.addEventListener("click", (e) => {
  e.preventDefault();
  if (document.body.classList.contains("menu-open")) closeMobileMenu();
  else openMobileMenu();
});

mobileMenuBackdrop?.addEventListener("click", closeMobileMenu);
mobileLinks.forEach((link) => link.addEventListener("click", closeMobileMenu));

window.addEventListener("resize", () => {
  if (!mobileBp.matches) closeMobileMenu();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeMobileMenu();
    if (exclusivePanel && !exclusivePanel.hidden) {
      closeExclusivePanel();
    }
    closeModal();
  }
});

function showToast(message, { duration = 4500 } = {}) {
  let host = document.getElementById("siteToastHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "siteToastHost";
    host.className = "site-toast-host";
    document.body.appendChild(host);
  }
  const node = document.createElement("div");
  node.className = "site-toast";
  node.setAttribute("role", "status");
  node.textContent = message;
  host.appendChild(node);
  requestAnimationFrame(() => node.classList.add("site-toast--visible"));
  let tmr = window.setTimeout(() => {
    node.classList.remove("site-toast--visible");
    window.setTimeout(() => node.remove(), 220);
  }, duration);
  node.addEventListener("click", () => {
    window.clearTimeout(tmr);
    node.classList.remove("site-toast--visible");
    window.setTimeout(() => node.remove(), 220);
  });
}

document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-placeholder-link]");
  if (link) {
    e.preventDefault();
    showToast(link.dataset.placeholderLink || "Поставь ссылку");
  }
});

function renderSkeletonGrid(selector, count = 4, variant = "default") {
  const wrap = $(selector);
  if (!wrap) return;
  wrap.replaceChildren();

  for (let i = 0; i < count; i += 1) {
    const card = el("div", { className: `card skeleton-card ${variant === "row" ? "skeleton-row" : ""}` });

    const media = el("div", { className: "media skeleton skeleton-media" });
    card.appendChild(media);

    const pad = el("div", { className: "pad" });
    const line1 = el("div", { className: "skeleton skeleton-line skeleton-line-lg" });
    const line2 = el("div", { className: "skeleton skeleton-line skeleton-line-sm" });
    pad.appendChild(line1);
    pad.appendChild(line2);
    card.appendChild(pad);

    wrap.appendChild(card);
  }
}

/** Загрузка таблиц для сеток; идёт параллельно с refreshClubSession, чтобы не ждать сессию и каталог по очереди. */
const loadCatalogFromDb = async () => {
  if (!window.dbLayer) return;
  const [events, releases, podcasts, merch, liveItems] = await Promise.all([
    window.dbLayer.getEvents(),
    window.dbLayer.getReleases(),
    window.dbLayer.getPodcasts(),
    window.dbLayer.getMerch(),
    window.dbLayer.getLiveItems ? window.dbLayer.getLiveItems() : Promise.resolve([])
  ]);
  data.events = events;
  data.releases = releases;
  data.podcasts = podcasts;
  data.merch = merch;
  data.live = Array.isArray(liveItems) ? liveItems : [];
  if (typeof window.dbLayer.getDbHealth === "function") {
    setDbNotice(window.dbLayer.getDbHealth());
  }
};

const initApp = async () => {
  // Показать скелетоны до загрузки данных из БД
  renderSkeletonGrid("#eventsGrid", 6);
  renderSkeletonGrid("#releasesGrid", 4);
  renderSkeletonGrid("#streamsLiveList", 4, "row");
  renderSkeletonGrid("#merchGrid", 4);

  if (window.dbLayer) {
    await Promise.all([refreshClubSession(), loadCatalogFromDb()]);
  }

  const yearNode = $("#year");
  if (yearNode) yearNode.textContent = new Date().getFullYear();

  renderEvents();
  renderReleases();
  renderStreams();
  renderMerch();

  // Пример карусели изображений (можно заменить urls на свой массив)
  const carouselContainer = document.getElementById("carouselContainer");
  if (carouselContainer) {
    createCarousel(carouselContainer, {
      urls: [
        HERO_PRINT_URL,
        getDefaultLogoUrl()
      ].filter(Boolean),
      intervalMs: 5000,
      pauseOnHover: true
    });
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  closeModal();
  window.addEventListener("db:health", (evt) => setDbNotice(evt?.detail || null));
  if (window.dbLayer) {
    await window.dbLayer.syncDefaultData();
  }
  bindStreamsSectionPanels();
  bindSectionNavScroll();
  await initApp();
  initClubAuth();
});

