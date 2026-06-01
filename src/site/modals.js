import { createCarousel } from '../carousel.js';
import { $, el, safeHttpUrl } from './dom.js';
import { fmtDateShort, fmtDateDots, fmtDateDex } from './format.js';
import { getDefaultLogoUrl } from '../logoUrls.js';
import { createMedia, resolveImageSrc, resolveMerchImageSrc } from './media.js';
import { getEventStreamUrl, streamUrlToEmbed } from './streams.js';
import { clubSession, streamsAuthOk } from './state.js';
import { closeMobileMenu } from './mobile-menu.js';

export const modal = $("#modal");
export const mTitle = $("#mTitle");
export const mSub = $("#mSub");
export const mBody = $("#mBody");

export const openModal = ({ title, sub, body }) => {
  if (mTitle) mTitle.textContent = title || "—";
  if (mSub) mSub.textContent = sub || "";
  if (mBody) mBody.replaceChildren(body || document.createTextNode(""));
  if (mBody) {
    syncAfishaModalContentWidth(mBody);
    mBody.scrollTop = 0;
    requestAnimationFrame(() => {
      syncAfishaModalContentWidth(mBody);
      mBody.scrollTop = 0;
    });
  }
  if (modal) modal.style.display = "flex";
};

export const destroyLiveModalVideos = () => {
  mBody?.querySelectorAll(".live-modal-video-file").forEach((v) => {
    v._hlsInstance?.destroy();
    v._hlsInstance = null;
    v.removeAttribute("src");
    v.load();
  });
};

export const closeModal = () => {
  clearAfishaModalWidthSync(mBody);
  mBody?.querySelector(".live-modal-iframe")?.setAttribute("src", "");
  destroyLiveModalVideos();
  if (modal) modal.style.display = "none";
};

export const attachHlsToVideo = async (videoEl, src) => {
  try {
    const { default: Hls } = await import("hls.js");
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(videoEl);
      videoEl._hlsInstance = hls;
      return;
    }
  } catch (err) {
    console.warn("[radio] HLS player failed", err);
  }
  if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
    videoEl.src = src;
  }
};

export const exclusivePanel = $("#exclusivePanel");
export const exclusiveHint = $("#exclusiveHint");

export function setExclusivePanelOpen(open) {
  if (exclusivePanel) {
    exclusivePanel.hidden = !open;
    exclusivePanel.setAttribute("aria-hidden", open ? "false" : "true");
  }
  if (exclusiveHint) {
    exclusiveHint.hidden = open;
    exclusiveHint.setAttribute("aria-expanded", open ? "true" : "false");
  }
}

export function openExclusivePanel() {
  setExclusivePanelOpen(true);
}

export function closeExclusivePanel() {
  setExclusivePanelOpen(false);
}

export function bindHintPressHandlers(hint) {
  if (!hint) return;
  hint.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      hint.click();
    }
  });
}

/** Верх раздела у верхней границы окна; отступ под фиксированный топбар — в CSS (scroll-margin-top). */
export const scrollOptsSectionNav = { behavior: "smooth", block: "start", inline: "nearest" };

export function scrollToStreamsSection() {
  document.getElementById("streams")?.scrollIntoView(scrollOptsSectionNav);
  try {
    history.replaceState(null, "", "#streams");
  } catch {
    window.location.hash = "streams";
  }
}

export function scrollToExclusiveSection() {
  document.getElementById("exclusive")?.scrollIntoView(scrollOptsSectionNav);
  try {
    history.replaceState(null, "", "#exclusive");
  } catch {
    window.location.hash = "exclusive";
  }
}

export function goToHomeScreen() {
  closeMobileMenu();
  closeModal();
  closeExclusivePanel();
  document.getElementById("home")?.scrollIntoView(scrollOptsSectionNav);
  try {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  } catch {
    window.location.hash = "";
  }
}

/** Клики по пунктам меню: прокрутка к началу раздела без «хвостов» соседних блоков (см. scroll-margin-top в CSS). */
export function bindSectionNavScroll() {
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

export function bindStreamsSectionPanels() {
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

export const appendDivider = (parent) => parent.appendChild(el("div", { className: "divider" }));

export const AFISHA_WIDTH_SYNC_ALL =
  ".event-modal-poster-slot, .event-modal-right.afisha-modal-right, .afisha-modal-actions";

/** На десктопе текст не сужаем до ширины постера — только постер и кнопка билетов. */
export function afishaWidthSyncTargets(wrap) {
  const mobile = window.matchMedia("(max-width: 768px)").matches;
  const sel = mobile
    ? AFISHA_WIDTH_SYNC_ALL
    : ".event-modal-poster-slot, .afisha-modal-actions";
  return [...wrap.querySelectorAll(sel)];
}

export function clearAfishaModalWidthSync(root) {
  root?.querySelectorAll(".afisha-modal-wrap").forEach((wrap) => {
    wrap._afishaWidthObs?.disconnect();
    wrap._afishaWidthObs = null;
    wrap.querySelectorAll(AFISHA_WIDTH_SYNC_ALL).forEach((el) => {
      el.style.maxWidth = "";
      el.style.width = "";
      el.style.marginLeft = "";
      el.style.marginRight = "";
    });
  });
}

/** Текст и кнопка не шире фактического постера (иначе dvh-эвристика не совпадает с картинкой). */
export function syncAfishaModalContentWidth(root) {
  const wrap = root?.classList?.contains("afisha-modal-wrap")
    ? root
    : root?.querySelector?.(".afisha-modal-wrap:not(.live-stream-modal-wrap)");
  if (!wrap || wrap.classList.contains("afisha-modal-dex")) return;

  const img =
    wrap.querySelector(".event-modal-poster-slot img") ||
    wrap.querySelector(".event-modal-left .media img");
  if (!img) return;

  const apply = () => {
    wrap.querySelectorAll(AFISHA_WIDTH_SYNC_ALL).forEach((el) => {
      el.style.maxWidth = "";
      el.style.width = "";
      el.style.marginLeft = "";
      el.style.marginRight = "";
    });
    const syncTargets = afishaWidthSyncTargets(wrap);
    const w = Math.ceil(img.getBoundingClientRect().width);
    if (w < 1) return;
    const px = `${w}px`;
    syncTargets.forEach((el) => {
      el.style.boxSizing = "border-box";
      el.style.width = px;
      el.style.maxWidth = px;
      el.style.marginLeft = "auto";
      el.style.marginRight = "auto";
    });
  };

  const schedule = () => requestAnimationFrame(apply);

  if (img.complete) schedule();
  else img.addEventListener("load", schedule, { once: true });

  wrap._afishaWidthObs?.disconnect();
  const ro = new ResizeObserver(schedule);
  ro.observe(img);
  wrap._afishaWidthObs = ro;
}

export function lineupNamesFromEvent(eventItem) {
  return (Array.isArray(eventItem.lineup) ? eventItem.lineup : []).filter(
    (name) => String(name ?? "").trim() !== ""
  );
}

export function buildEventModalRightColumn(
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
      const chaos = el("div", { className: "event-lineup-chaos" });
      chaos.style.marginTop = aboutText ? "12px" : "0";
      chaos.setAttribute("aria-label", "Лайнап");
      lineupNames.forEach((name) => {
        chaos.appendChild(el("span", { className: "event-lineup-chaos-item", text: String(name) }));
      });
      right.appendChild(chaos);
    } else {
      const lineup = el("div", { className: "event-lineup" });
      lineup.style.marginTop = aboutText ? "12px" : "0";
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

export function buildEventModalTicketActions(eventItem) {
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
    const link = el("a", { className: "btn primary event-ticket-btn", text: "Купить билет" });
    link.href = ticketUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    actions.appendChild(link);
  } else {
    const button = el("button", { className: "btn primary event-ticket-btn", text: "Купить билет" });
    button.type = "button";
    button.addEventListener("click", () => alert("Тут будет ссылка на билеты/регистрацию"));
    actions.appendChild(button);
  }
  return actions;
}

export function appendLiveStreamMediaSlot(posterSlot, eventItem) {
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
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    wrap.appendChild(iframe);
    posterSlot.appendChild(wrap);
    return;
  }

  if ((kind === "video" || kind === "hls") && video) {
    const wrap = el("div", { className: "media live-modal-video-file-wrap" });
    const v = document.createElement("video");
    v.className = "live-modal-video-file";
    v.controls = true;
    v.playsInline = true;
    v.setAttribute("preload", "none");
    v.setAttribute("controlsList", "nodownload");
    if (kind === "hls") {
      void attachHlsToVideo(v, video);
    } else {
      v.src = video;
    }
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

export function appendAfishaDexTicketLink(parent, eventItem) {
  const rawTicketUrl =
    eventItem.ticketUrl ||
    eventItem.ticket_url ||
    eventItem.ticketsUrl ||
    eventItem.tickets_url ||
    eventItem.ticket ||
    eventItem.tickets;
  const ticketUrl = safeHttpUrl(rawTicketUrl);

  if (ticketUrl) {
    const link = el("a", { className: "afisha-modal-ticket", text: "Купить билет" });
    link.href = ticketUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    parent.appendChild(link);
    return;
  }

  const btn = el("button", { className: "afisha-modal-ticket", text: "Купить билет" });
  btn.type = "button";
  btn.addEventListener("click", () => alert("Тут будет ссылка на билеты/регистрацию"));
  parent.appendChild(btn);
}

export function appendAfishaDexModalContent(scrollCol, eventItem) {
  const inner = el("div", { className: "afisha-modal-inner" });

  const meta = el("div", { className: "afisha-modal-meta" });
  meta.appendChild(el("span", { className: "afisha-modal-date", text: fmtDateDex(eventItem.date) }));
  inner.appendChild(meta);

  appendAfishaDexTicketLink(inner, eventItem);

  const aboutText = String(eventItem.about ?? "").trim();
  if (aboutText) {
    inner.appendChild(el("div", { className: "afisha-modal-divider" }));
    const about = el("div", { className: "afisha-modal-about" });
    about.style.whiteSpace = "pre-line";
    about.textContent = aboutText;
    inner.appendChild(about);
  }

  const lineupNames = lineupNamesFromEvent(eventItem);
  if (lineupNames.length) {
    inner.appendChild(el("div", { className: "afisha-modal-divider" }));
    const lineup = el("p", { className: "afisha-modal-lineup" });
    lineup.textContent = lineupNames.join(", ");
    inner.appendChild(lineup);
  }

  if (eventItem.address) {
    inner.appendChild(el("div", { className: "afisha-modal-divider" }));
    inner.appendChild(el("b", { className: "afisha-modal-lineup-title", text: "Адрес" }));
    const addressEl = el("div", { className: "afisha-modal-about" });
    addressEl.textContent = String(eventItem.address);
    inner.appendChild(addressEl);
  }

  scrollCol.appendChild(inner);
}

/** Афиша в модалке: как dexclub.net — постер | прокручиваемый текст (50/50 на десктопе). */
export function buildEventModalBody(eventItem) {
  const wrapper = el("div", { className: "event-modal-wrap afisha-modal-wrap afisha-modal-dex" });

  const media = el("div", { className: "afisha-modal-media event-modal-left" });
  const posterSlot = el("div", { className: "event-modal-poster-slot" });
  posterSlot.appendChild(
    createMedia(eventItem.poster || "logo.png", eventItem.title, "media afisha-modal-poster")
  );
  media.appendChild(posterSlot);
  wrapper.appendChild(media);

  const scrollCol = el("div", { className: "afisha-modal-scroll" });
  appendAfishaDexModalContent(scrollCol, eventItem);
  wrapper.appendChild(scrollCol);

  return wrapper;
}

/** Модалка Live: видео/плейсхолдер на всю ширину, описание под ним (без билетов) */
export function buildLiveStreamModalBody(eventItem) {
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

export function buildReleaseModalBody(release) {
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

export function getMerchImageUrls(item) {
  let list = item.images;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      list = null;
    }
  }

  const rawUrls = [];
  const poster = item.poster || item.image || item.cover;
  const posterTrimmed = poster != null ? String(poster).trim() : "";
  if (posterTrimmed && posterTrimmed !== "logo.png" && posterTrimmed !== "smile.png") {
    rawUrls.push(posterTrimmed);
  }
  if (Array.isArray(list)) {
    list.forEach((u) => {
      const s = String(u || "").trim();
      if (s && s !== "logo.png" && s !== "smile.png") rawUrls.push(s);
    });
  }

  const seen = new Set();
  const resolved = [];
  rawUrls.forEach((raw) => {
    const url = resolveMerchImageSrc(raw);
    if (!seen.has(url)) {
      seen.add(url);
      resolved.push(url);
    }
  });

  if (resolved.length) return resolved;
  return [resolveMerchImageSrc("logo.png")];
}

export function buildMerchModalBody(item) {
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

export let authModalContent = null;

export function openAuthModal() {
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

export const openEventModal = (eventItem) => {
  if (!eventItem) return;
  openModal({
    title: eventItem.title,
    sub: "",
    body: buildEventModalBody(eventItem)
  });
};

export const openLiveStreamModal = (eventItem) => {
  if (!eventItem) return;
  openModal({
    title: eventItem.title,
    sub: `${fmtDateDots(eventItem.date)} · ${eventItem.place || "—"}`,
    body: buildLiveStreamModalBody(eventItem)
  });
};
