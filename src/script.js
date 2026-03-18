// Copied from original script.js with no behavior changes.

import { createCarousel } from "./carousel.js";

// IMPORTANT:
// 1) Сохрани твою картинку рядом с index.html
// 2) Назови файл https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/logo.png (или поменяй все src="https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/logo.png" на свое имя)

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const pad2 = (n) => String(n).padStart(2, "0");

// Базовый URL для относительных путей, указывающий на публичный бакет Supabase
const ASSET_PREFIX = "https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/";

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

const sortAsc = (arr, key) => [...arr].sort((a, b) => new Date(a[key]) - new Date(b[key]));

let data = {
  events: [],
  artists: [],
  releases: [],
  podcasts: [],
  streams: [],
  merch: []
};

const BOOKING_ADMIN_ENDPOINT = "https://httpbin.org/post";
const BOOKING_COOLDOWN_MS = 60 * 1000;
const BOOKING_MIN_FILL_MS = 3000;
const BOOKING_REQUEST_TIMEOUT_MS = 12000;
const BOOKING_KEY = "npo_booking_last_submit_ts";
const CLUB_TOKEN_KEY = "npo_club_token_v1";
const CLUB_API_BASE = window.location.protocol === "file:" ? "http://localhost:8000" : "";
const ARTISTS_VISIBLE = 6;


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

let clubSession = null;

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
  const exclusiveLocked = $("#exclusiveLocked");
  const exclusiveContent = $("#exclusiveContent");
  const exclusiveBadge = $("#exclusiveBadge");

  const userIsAuthenticated = Boolean(clubSession?.email);

  if (authGuest) authGuest.style.display = userIsAuthenticated ? "none" : "grid";
  if (authMember) authMember.style.display = userIsAuthenticated ? "block" : "none";
  if (memberName) memberName.textContent = clubSession?.name || clubSession?.email || "участник";

  if (exclusiveLocked) exclusiveLocked.style.display = userIsAuthenticated ? "none" : "block";
  if (exclusiveContent) exclusiveContent.style.display = userIsAuthenticated ? "block" : "none";
  if (exclusiveBadge) exclusiveBadge.textContent = userIsAuthenticated ? "открыт" : "закрыт";

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
      { title: 'Members Promo Code', description: 'Скидка 15% на мерч и закрытые дропы.' }
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
        { title: 'Members Promo Code', description: 'Скидка 15% на мерч и закрытые дропы.' }
      ];
      renderExclusiveItems(mockExclusive);
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
        { title: 'Members Promo Code', description: 'Скидка 15% на мерч и закрытые дропы.' }
      ];
      renderExclusiveItems(mockExclusive);
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
    renderClubAccess();
    setClubStatus("Ты вышел из аккаунта.");
  });

  refreshClubSession();
}

function setupOpenCard(node, type, id) {
  if (!node) return;
  node.classList.add("open-card");
  node.dataset.open = type;
  node.dataset.id = id;
  node.tabIndex = 0;
  node.setAttribute("role", "button");
  node.addEventListener("pointerdown", () => node.classList.add("is-pressed"));
  ["pointerup", "pointerleave", "pointercancel", "blur"].forEach((evt) => {
    node.addEventListener(evt, () => node.classList.remove("is-pressed"));
  });
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

  const defaultLogo = "https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/logo.png";
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
    this.src = defaultLogo;
  };

  media.appendChild(img);
  return media;
}

function resolveImageSrc(imgSrc) {
  const defaultLogo = "https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/logo.png";
  const raw = String(imgSrc || "").trim();
  if (!raw || raw === "logo.png" || raw === "smile.png") return defaultLogo;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (ASSET_PREFIX) return ASSET_PREFIX + raw.replace(/^\/+/, "");
  return defaultLogo;
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
}

function renderArtists() {
  const wrap = $("#artistsGrid");
  if (!wrap) return;
  wrap.replaceChildren();

  const list = [...data.artists].sort((a, b) => {
    if (a.name === "WEI" && b.name !== "WEI") return -1;
    if (b.name === "WEI" && a.name !== "WEI") return 1;
    return a.name.localeCompare(b.name);
  });

  list.forEach((artist) => {
    const card = el("div", { className: "card artist-card" });
    card.appendChild(createMedia(artist.poster || "logo.png", artist.name, "media square"));

    const pad = el("div", { className: "pad artist-card-body" });
    pad.appendChild(el("b", { className: "artist-card-name", text: artist.name }));
    card.appendChild(pad);

    setupOpenCard(card, "artist", artist.id);
    wrap.appendChild(card);
  });
}

function renderReleases() {
  const wrap = $("#releasesGrid");
  if (!wrap) return;
  wrap.replaceChildren();

  [...data.releases].sort((a, b) => b.date.localeCompare(a.date)).forEach((release) => {
    const card = el("div", { className: "card" });
    card.appendChild(createMedia(release.cover || release.poster || release.image || "logo.png", release.title, "media square"));

    const pad = el("div", { className: "pad" });

    const title = el("b", { text: release.title });
    title.style.maxWidth = "100%";
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";
    title.style.whiteSpace = "nowrap";

    pad.appendChild(title);

    const date = el("div", { className: "muted", text: release.date });
    date.style.marginTop = "6px";
    pad.appendChild(date);

    card.appendChild(pad);
    setupOpenCard(card, "release", release.id);
    wrap.appendChild(card);
  });
}

function renderStreams() {
  const wrap = $("#streamsList");
  if (!wrap) return;
  wrap.replaceChildren();

  data.streams.forEach((stream) => {
    const row = el("div", { className: "card pad" });
    const content = el("div", { className: "row sp" });

    const title = el("b", { text: stream.title });
    title.style.maxWidth = "72%";
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";
    title.style.whiteSpace = "nowrap";

    content.appendChild(title);
    content.appendChild(createTag(stream.date));
    row.appendChild(content);

    setupOpenCard(row, "stream", stream.id);
    wrap.appendChild(row);
  });

  const now = new Date();
  const next = sortAsc(data.events, "date").filter((e) => new Date(e.date) >= now)[0];
  const streamNext = $("#streamNext");
  if (streamNext) {
    streamNext.textContent = next ? `Следующий эфир: ${next.title} · ${fmtDT(next.date)}` : "Следующий эфир: —";
  }
}

function renderMerch() {
  const wrap = $("#merchGrid");
  if (!wrap) return;
  wrap.replaceChildren();

  data.merch.forEach((item) => {
    const card = el("div", { className: "card merch-card" });
    card.appendChild(createMedia(item.image || item.poster || item.cover || "logo.png", item.title, "media square"));

    const pad = el("div", { className: "pad merch-card-body" });
    pad.appendChild(el("b", { className: "merch-card-title", text: item.title }));

    const price = el("div", { className: "muted", text: item.price });
    price.style.marginTop = "6px";
    pad.appendChild(price);

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
  if (modal) modal.style.display = "flex";
};

const closeModal = () => {
  if (modal) modal.style.display = "none";
};

const appendDivider = (parent) => parent.appendChild(el("div", { className: "divider" }));

function buildEventModalBody(eventItem) {
  const wrapper = el("div", { className: "event-modal-wrap" });

  const left = el("div", { className: "card event-modal-left" });
  left.appendChild(createMedia(eventItem.poster || "logo.png", eventItem.title, "media"));

  const right = el("div", { className: "card pad event-modal-right" });
  const about = el("div", { className: "muted", text: eventItem.about || "—" });
  about.style.marginTop = "8px";
  right.appendChild(about);

  appendDivider(right);
  const lineup = el("div", { className: "muted" });
  lineup.style.marginTop = "8px";
  (eventItem.lineup || []).forEach((name, idx) => {
    if (idx > 0) lineup.appendChild(document.createElement("br"));
    lineup.appendChild(document.createTextNode(name));
  });
  right.appendChild(lineup);

  if (eventItem.address) {
    appendDivider(right);
    right.appendChild(el("b", { text: "Адрес" }));
    const addressEl = el("div", { className: "muted", text: eventItem.address });
    addressEl.style.marginTop = "8px";
    right.appendChild(addressEl);
  }

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
  const actions = el("div", { className: "event-modal-actions" });
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

  wrapper.appendChild(left);
  wrapper.appendChild(right);
  wrapper.appendChild(actions);
  return wrapper;
}

function buildArtistModalBody(artist) {
  const wrapper = el("div", { className: "event-modal-wrap" });

  const left = el("div", { className: "card event-modal-left" });
  const mediaClass = artist.poster ? "media square cover" : "media square";
  left.appendChild(createMedia(artist.poster || "logo.png", artist.name, mediaClass));

  const right = el("div", { className: "card pad event-modal-right" });

  const bio = el("div", { className: "muted", text: artist.bio || "—" });
  right.appendChild(bio);

  const actions = el("div", { className: "event-modal-actions" });
  actions.style.gap = "10px";

  const bandcamp = el("button", { className: "btn event-ticket-btn", text: "Bandcamp" });
  bandcamp.type = "button";
  bandcamp.addEventListener("click", () => alert("Bandcamp (поставишь ссылку)"));
  actions.appendChild(bandcamp);

  const soundcloud = el("button", { className: "btn event-ticket-btn", text: "SoundCloud" });
  soundcloud.type = "button";
  soundcloud.addEventListener("click", () => alert("SoundCloud (поставишь ссылку)"));
  actions.appendChild(soundcloud);

  wrapper.appendChild(left);
  wrapper.appendChild(right);
  wrapper.appendChild(actions);
  return wrapper;
}

function buildReleaseModalBody(release) {
  const wrapper = el("div", { className: "event-modal-wrap" });

  const left = el("div", { className: "card event-modal-left" });
  left.appendChild(createMedia(release.cover || release.poster || release.image || "logo.png", release.title, "media"));

  const right = el("div", { className: "card pad event-modal-right" });
  right.appendChild(el("b", { text: "Треклист" }));
  appendDivider(right);

  const tracklist = el("div", { className: "muted" });
  (release.tracklist || []).forEach((track, idx) => {
    if (idx > 0) tracklist.appendChild(document.createElement("br"));
    tracklist.appendChild(document.createTextNode(`• ${track}`));
  });
  right.appendChild(tracklist);

  const actions = el("div", { className: "event-modal-actions" });
  actions.style.gap = "10px";

  const bandcamp = el("button", { className: "btn event-ticket-btn", text: "Bandcamp" });
  bandcamp.type = "button";
  bandcamp.addEventListener("click", () => alert("Bandcamp (поставишь ссылку)"));
  actions.appendChild(bandcamp);

  const soundcloud = el("button", { className: "btn event-ticket-btn", text: "SoundCloud" });
  soundcloud.type = "button";
  soundcloud.addEventListener("click", () => alert("SoundCloud (поставишь ссылку)"));
  actions.appendChild(soundcloud);

  wrapper.appendChild(left);
  wrapper.appendChild(right);
  wrapper.appendChild(actions);
  return wrapper;
}

function buildStreamModalBody(stream) {
  const card = el("div", { className: "card pad" });
  card.appendChild(el("b", { text: "Воспроизведение" }));
  appendDivider(card);
  card.appendChild(createMedia(stream.cover || stream.poster || stream.image || "logo.png", stream.title, "media wide"));

  const hint = el("div", { className: "muted", text: "Тут будет YouTube/Vimeo embed." });
  hint.style.marginTop = "10px";
  card.appendChild(hint);
  return card;
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
  if (Array.isArray(list) && list.length > 0) return list;
  const single = item.image || item.poster || item.cover || "logo.png";
  return [single];
}

function buildMerchModalBody(item) {
  const wrapper = el("div", { className: "event-modal-wrap" });

  const left = el("div", { className: "card event-modal-left" });
  const imageSources = getMerchImageUrls(item);
  const imageUrls = imageSources.map(resolveImageSrc);
  const carouselContainer = el("div", { className: "merch-modal-carousel-wrap" });
  left.appendChild(carouselContainer);
  createCarousel(carouselContainer, {
    urls: imageUrls,
    intervalMs: 5000,
    pauseOnHover: true,
    carouselClass: "carousel merch-modal-carousel"
  });

  const right = el("div", { className: "card pad event-modal-right" });
  // Описание из Supabase: колонка desc или description
  const descText = (item.desc != null && String(item.desc).trim() !== "")
    ? String(item.desc)
    : (item.description != null && String(item.description).trim() !== "")
      ? String(item.description)
      : "Футболки — Марина Бибик, принты — Лофер";
  const desc = el("div", { className: "muted", text: descText });
  desc.style.marginTop = "8px";
  right.appendChild(desc);

  const actions = el("div", { className: "event-modal-actions" });
  const preorderUrl = (item.preorder_url != null && String(item.preorder_url).trim() !== "")
    ? String(item.preorder_url).trim()
    : (item.preorderUrl != null && String(item.preorderUrl).trim() !== "")
      ? String(item.preorderUrl).trim()
      : "";
  const button = el("button", { className: "btn primary event-ticket-btn", text: "Предзаказ" });
  button.type = "button";
  if (preorderUrl) {
    button.addEventListener("click", () => window.open(preorderUrl, "_blank", "noopener"));
  } else {
    button.addEventListener("click", () => alert("Тут будет форма/бот"));
  }
  actions.appendChild(button);

  wrapper.appendChild(left);
  wrapper.appendChild(right);
  wrapper.appendChild(actions);
  return wrapper;
}

function buildProfileModalBody() {
  const wrap = el("div", { className: "profile-modal-wrap" });

  const exclusiveContent = $("#exclusiveContent");
  if (exclusiveContent && exclusiveContent.children.length) {
    const block = el("div", { className: "profile-modal-exclusive" });
    const headingWrap = el("div");
    headingWrap.style.textAlign = "center";
    headingWrap.appendChild(el("b", { text: "Эксклюзив" }));
    block.appendChild(headingWrap);
    appendDivider(block);
    block.appendChild(exclusiveContent.cloneNode(true));
    wrap.appendChild(block);
  }

  const footer = el("div", { className: "profile-modal-footer" });
  footer.style.marginTop = "24px";
  footer.style.paddingTop = "16px";
  footer.style.borderTop = "1px solid rgba(255,255,255,0.1)";
  const logoutBtn = el("button", { className: "btn", text: "Выйти", type: "button" });
  logoutBtn.addEventListener("click", async () => {
    try {
      await window.dbLayer.logout();
    } catch {}
    clubSession = null;
    renderClubAccess();
    setClubStatus("Ты вышел из аккаунта.");
    closeModal();
  });
  footer.appendChild(logoutBtn);
  wrap.appendChild(footer);

  return wrap;
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

function openProfileModal() {
  if (!clubSession) return;
  const userName = clubSession?.name || clubSession?.email || "Профиль";
  openModal({
    title: userName,
    sub: "",
    body: buildProfileModalBody()
  });
}

const openEventModal = (eventItem) => {
  if (!eventItem) return;
  openModal({
    title: eventItem.title,
    sub: `${fmtDT(eventItem.date)} · ${eventItem.place || "—"}`,
    body: buildEventModalBody(eventItem)
  });
};

$("#mClose")?.addEventListener("click", closeModal);
modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// Профиль: по клику — модалка; неавторизованным в том же месте показываем «Вход», по клику — модалка входа
document.addEventListener("click", (e) => {
  const profileTrigger = e.target.closest(".profile-button, a[href='#profile']");
  if (profileTrigger && clubSession) {
    e.preventDefault();
    openProfileModal();
    return;
  }
  if (profileTrigger && !clubSession) {
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

  if (type === "artist") {
    const artist = data.artists.find((x) => x.id === id);
    if (!artist) return;
    openModal({
      title: artist.name,
      sub: artist.role || artist.genre || "Артист",
      body: buildArtistModalBody(artist)
    });
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

  if (type === "stream") {
    const stream = data.streams.find((x) => x.id === id);
    if (!stream) return;
    openModal({ title: stream.title, sub: stream.date, body: buildStreamModalBody(stream) });
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

const navLinks = $$(".nav a");
const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);

// IntersectionObserver used to add 'active' class to nav links. 
// Removed as per user request to only highlight on hover.

const mobileMenuToggle = $("#mobileMenuToggle");
const mobileMenu = $("#mobileMenu");
const mobileMenuBackdrop = $("#mobileMenuBackdrop");
const mobileLinks = $$("#mobileMenu a");
const mobileBp = window.matchMedia("(max-width: 980px)");

const closeMobileMenu = () => {
  document.body.classList.remove("menu-open");
  mobileMenuToggle?.setAttribute("aria-expanded", "false");
  if (mobileMenu) mobileMenu.hidden = true;
  if (mobileMenuBackdrop) mobileMenuBackdrop.hidden = true;
};

const openMobileMenu = () => {
  if (mobileMenu) mobileMenu.hidden = false;
  if (mobileMenuBackdrop) mobileMenuBackdrop.hidden = false;
  document.body.classList.add("menu-open");
  mobileMenuToggle?.setAttribute("aria-expanded", "true");
};

mobileMenuToggle?.addEventListener("click", (e) => {
  e.preventDefault();
  if (!mobileBp.matches) {
    window.location.hash = "home";
    return;
  }
  if (document.body.classList.contains("menu-open")) closeMobileMenu();
  else openMobileMenu();
});

mobileMenuBackdrop?.addEventListener("click", closeMobileMenu);
mobileLinks.forEach((link) => link.addEventListener("click", closeMobileMenu));

window.addEventListener("resize", () => {
  if (!mobileBp.matches) closeMobileMenu();
  renderArtists();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeMobileMenu();
    closeModal();
  }
});

document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-placeholder-link]");
  if (link) {
    e.preventDefault();
    alert(link.dataset.placeholderLink || "Поставь ссылку");
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

const initApp = async () => {
  // Показать скелетоны до загрузки данных из БД
  renderSkeletonGrid("#eventsGrid", 6);
  renderSkeletonGrid("#artistsGrid", ARTISTS_VISIBLE);
  renderSkeletonGrid("#releasesGrid", 4);
  renderSkeletonGrid("#streamsList", 4, "row");
  renderSkeletonGrid("#merchGrid", 4);

  if (window.dbLayer) {
    await window.dbLayer.syncDefaultData();
    const [events, artists, releases, podcasts, streams, merch] = await Promise.all([
      window.dbLayer.getEvents(),
      window.dbLayer.getArtists(),
      window.dbLayer.getReleases(),
      window.dbLayer.getPodcasts(),
      window.dbLayer.getStreams(),
      window.dbLayer.getMerch()
    ]);
    data.events = events;
    data.artists = artists;
    data.releases = releases;
    data.podcasts = podcasts;
    data.streams = streams;
    data.merch = merch;
  }

  const yearNode = $("#year");
  if (yearNode) yearNode.textContent = new Date().getFullYear();

  renderEvents();
  renderArtists();
  renderReleases();
  renderStreams();
  renderMerch();
  initClubAuth();

  // Пример карусели изображений (можно заменить urls на свой массив)
  const carouselContainer = document.getElementById("carouselContainer");
  if (carouselContainer) {
    createCarousel(carouselContainer, {
      urls: [
        ASSET_PREFIX + "npo_print_source%20(1).png",
        ASSET_PREFIX + "logo.png"
      ].filter(Boolean),
      intervalMs: 5000,
      pauseOnHover: true
    });
  }
};

document.addEventListener("DOMContentLoaded", initApp);

