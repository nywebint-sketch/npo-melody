import "./booking.js";
import "./nav.js";
import "./ui.js";
import "./bootstrap.js";

import { closeModal, bindSectionNavScroll, bindStreamsSectionPanels } from "./modals.js";
import { setDbNotice, setDbRetryHandler } from "./db-notice.js";
import { initClubAuth } from "./club.js";
import { initApp, loadCatalogFromDb } from "./init.js";
import { loadFooterSocialsFromDb, renderFooterSocials } from "./footer.js";
import { renderEvents, renderReleases, renderStreams, renderMerch } from "./catalog.js";
import { renderSkeletonGrid } from "./ui.js";
import { isReleasesSectionVisible } from "./state.js";

setDbRetryHandler(async () => {
  renderSkeletonGrid("#eventsGrid", 6);
  if (isReleasesSectionVisible()) renderSkeletonGrid("#releasesGrid", 4);
  renderSkeletonGrid("#streamsLiveList", 4, "row");
  renderSkeletonGrid("#merchGrid", 4);
  await Promise.all([loadCatalogFromDb(), loadFooterSocialsFromDb().then(renderFooterSocials)]);
  renderEvents();
  if (isReleasesSectionVisible()) renderReleases();
  renderStreams();
  renderMerch();
});

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
