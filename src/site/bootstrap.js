import { $, el } from "./dom.js";
import * as appState from "./state.js";
import { clubSession, setClubSession, toggleEventsArchiveExpanded } from "./state.js";
import { STUDIO_SERVICES } from "./constants.js";
import {
  modal,
  closeModal,
  openAuthModal,
  openEventModal,
  openLiveStreamModal,
  openModal,
  closeExclusivePanel,
  buildReleaseModalBody,
  buildMerchModalBody,
  appendDivider
} from "./modals.js";
import { createMedia } from "./media.js";
import { renderEvents, openStudioModal, renderStreams } from "./catalog.js";
import { renderClubAccess, setClubStatus } from "./club.js";
import { closeMobileMenu } from "./mobile-menu.js";
$("#mClose")?.addEventListener("click", closeModal);
modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

$("#eventsArchiveToggleBtn")?.addEventListener("click", () => {
  toggleEventsArchiveExpanded();
  renderEvents();
});

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
      setClubSession(null);
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
    openEventModal(appState.data.events.find((x) => x.id === id));
    return;
  }

  if (type === "live-event") {
    const eventItem = appState.data.live.find((x) => String(x.id) === String(id));
    if (eventItem) openLiveStreamModal(eventItem);
    return;
  }

  if (type === "release") {
    const release = appState.data.releases.find((x) => x.id === id);
    if (!release) return;
    openModal({
      title: release.title,
      sub: `${release.date} · ${release.format}`,
      body: buildReleaseModalBody(release)
    });
    return;
  }

  if (type === "podcast") {
    const podcast = appState.data.podcasts.find((x) => x.id === id);
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
    const item = appState.data.merch.find((x) => x.id === id);
    if (!item) return;
    openModal({ title: item.title, sub: item.price ? String(item.price) : "", body: buildMerchModalBody(item) });
    return;
  }

  if (type === "studio") {
    openStudioModal(STUDIO_SERVICES.find((x) => x.id === id));
  }
});
