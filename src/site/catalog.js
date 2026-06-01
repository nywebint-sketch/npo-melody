import { createCarousel } from '../carousel.js';
import { $, el, safeHttpUrl } from './dom.js';
import { EVENTS_VISIBLE_LIMIT, STUDIO_SERVICES, STUDIO_CONTACT_URL, sortAsc } from './constants.js';
import { recordsCountRu } from './format.js';
import { data, eventsArchiveExpanded, streamsAuthOk, isReleasesSectionVisible } from './state.js';
import { fmtDateShort, fmtDateDots } from './format.js';
import { createMedia, setupOpenCard, resolveMerchImageSrc } from './media.js';
import { getLiveRecordings, buildRadioYtCard, getEventStreamUrl } from './streams.js';
import { openModal } from './modals.js';

export function updateEventsArchiveToggle(hiddenCount) {
  const toggle = $("#eventsArchiveToggle");
  const btn = $("#eventsArchiveToggleBtn");
  if (!toggle || !btn) return;

  if (hiddenCount <= 0) {
    toggle.hidden = true;
    return;
  }

  toggle.hidden = false;
  btn.textContent = eventsArchiveExpanded ? "меньше" : "больше";
  btn.setAttribute("aria-expanded", eventsArchiveExpanded ? "true" : "false");
}

export function renderEvents() {
  const wrap = $("#eventsGrid");
  if (!wrap) return;

  const sorted = [...data.events].sort((a, b) => b.date.localeCompare(a.date));
  const hiddenCount = Math.max(0, sorted.length - EVENTS_VISIBLE_LIMIT);
  const toShow = eventsArchiveExpanded ? sorted : sorted.slice(0, EVENTS_VISIBLE_LIMIT);

  wrap.replaceChildren();

  toShow.forEach((eventItem) => {
    const card = el("div", { className: "card event-card" });
    card.appendChild(createMedia(eventItem.poster || "logo.png", eventItem.title, "media event-media event-poster"));
    const pad = el("div", { className: "pad" });
    pad.appendChild(el("b", { className: "event-card-title", text: eventItem.title }));
    card.appendChild(pad);
    setupOpenCard(card, "event", eventItem.id);
    wrap.appendChild(card);
  });

  updateEventsArchiveToggle(hiddenCount);

  if (streamsAuthOk()) renderStreamsLive();
}

export function renderReleases() {
  if (!isReleasesSectionVisible()) return;
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

export function renderStreamsLive() {
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
  const recordings = getLiveRecordings();

  if (!upcoming.length) {
    const total = data.live.length;
    if (total === 0) {
      wrap.appendChild(
        el("div", {
          className: "muted streams-live-empty",
          text: "Пока нет эфиров. Добавьте их в админ-панели: раздел «НПО РАДИО» (название и ссылка на YouTube / Rutube)."
        })
      );
    } else if (!recordings.length) {
      wrap.appendChild(
        el("div", {
          className: "muted streams-live-empty",
          text: "Нет предстоящих эфиров. Добавьте ссылку на видео в админке (НПО РАДИО) или задайте новую дату."
        })
      );
    }
    if (liveCount) liveCount.textContent = upcoming.length ? recordsCountRu(upcoming.length) : "";
  } else {
    upcoming.forEach((eventItem) => {
      const card = buildRadioYtCard(eventItem, {
        thumbBadge: fmtDateShort(eventItem.date)
      });
      setupOpenCard(card, "live-event", eventItem.id);
      wrap.appendChild(card);
    });
    if (liveCount) liveCount.textContent = recordsCountRu(upcoming.length);
  }

  renderStreamsRecordings();
}

export function renderStreamsRecordings() {
  const wrap = $("#streamsRecordingsList");
  if (!wrap) return;

  wrap.replaceChildren();

  if (!streamsAuthOk()) {
    wrap.hidden = true;
    return;
  }

  const recordings = getLiveRecordings();
  if (!recordings.length) {
    wrap.hidden = true;
    return;
  }

  wrap.hidden = false;

  recordings.forEach((eventItem) => {
    const card = buildRadioYtCard(eventItem);
    setupOpenCard(card, "live-event", eventItem.id);
    wrap.appendChild(card);
  });
}

export function renderStreams() {
  const now = new Date();
  const next = sortAsc(data.live, "date").filter((e) => new Date(e.date) >= now)[0];
  const streamNext = $("#streamNext");
  if (streamNext) {
    streamNext.textContent = next ? `Следующий эфир: ${next.title} · ${fmtDateDots(next.date)}` : "Следующий эфир: —";
  }
  renderStreamsLive();
}

export function renderStudio() {
  const wrap = $("#studioServicesList");
  if (!wrap) return;
  wrap.replaceChildren();

  STUDIO_SERVICES.forEach((service) => {
    const card = el("div", { className: "card pad studio-service-card" });
    card.appendChild(el("b", { className: "studio-service-card__title", text: service.title }));
    setupOpenCard(card, "studio", service.id);
    wrap.appendChild(card);
  });
}

export function buildStudioModalBody(service) {
  const body = el("div", { className: "studio-modal-body" });
  const aboutText = String(service.about ?? "").trim();
  const main = el("div", { className: "studio-modal-body__main" });
  main.appendChild(
    el("p", {
      className: "studio-modal-body__text",
      text: aboutText || "Подробности и запись — в Telegram."
    })
  );
  body.appendChild(main);

  const actions = el("div", { className: "studio-modal-body__actions" });
  const link = el("a", {
    className: "btn primary studio-modal-body__cta",
    text: "записаться"
  });
  link.href = STUDIO_CONTACT_URL;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  actions.appendChild(link);
  body.appendChild(actions);
  return body;
}

export const openStudioModal = (service) => {
  if (!service) return;
  openModal({
    title: service.title,
    sub: "",
    body: buildStudioModalBody(service)
  });
};

export function getMerchCardPreviewSrc(item) {
  let list = item.images;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      list = null;
    }
  }
  if (Array.isArray(list) && list.length) {
    const first = String(list[0] || "").trim();
    if (first && first !== "logo.png" && first !== "smile.png") {
      return resolveMerchImageSrc(first);
    }
  }
  const poster = item.poster || item.image || item.cover;
  const posterTrimmed = poster != null ? String(poster).trim() : "";
  if (posterTrimmed && posterTrimmed !== "logo.png" && posterTrimmed !== "smile.png") {
    return resolveMerchImageSrc(posterTrimmed);
  }
  return resolveMerchImageSrc("logo.png");
}

export function renderMerch() {
  const wrap = $("#merchGrid");
  if (!wrap) return;
  wrap.replaceChildren();

  data.merch.forEach((item) => {
    const card = el("div", { className: "card event-card" });
    card.appendChild(
      createMedia(getMerchCardPreviewSrc(item), item.title, "media event-media event-poster")
    );

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
