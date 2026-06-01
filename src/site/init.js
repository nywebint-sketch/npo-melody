import { createCarousel } from '../carousel.js';
import { HERO_PRINT_URL, getDefaultLogoUrl } from '../logoUrls.js';
import { DEFAULT_FOOTER_SOCIALS } from './constants.js';
import { data, isReleasesSectionVisible } from './state.js';
import { $ } from './dom.js';
import { loadFooterSocialsFromDb, renderFooterSocials } from './footer.js';
import { setDbNotice, setDbRetryHandler } from './db-notice.js';
import { refreshClubSession } from './club.js';
import { renderEvents, renderReleases, renderStreams, renderStudio, renderMerch } from './catalog.js';
import { renderSkeletonGrid } from './ui.js';

/** Загрузка таблиц для сеток; идёт параллельно с refreshClubSession, чтобы не ждать сессию и каталог по очереди. */
export const loadCatalogFromDb = async () => {
  if (!window.dbLayer) return;
  const [events, releases, podcasts, merch, liveItems] = await Promise.all([
    window.dbLayer.getEvents(),
    isReleasesSectionVisible() ? window.dbLayer.getReleases() : Promise.resolve([]),
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

export const initApp = async () => {
  // Показать скелетоны до загрузки данных из БД
  renderSkeletonGrid("#eventsGrid", 6);
  if (isReleasesSectionVisible()) renderSkeletonGrid("#releasesGrid", 4);
  renderSkeletonGrid("#streamsLiveList", 4, "row");
  renderSkeletonGrid("#merchGrid", 4);

  if (window.dbLayer) {
    await Promise.all([
      refreshClubSession(),
      loadCatalogFromDb(),
      loadFooterSocialsFromDb().then(renderFooterSocials)
    ]);
  } else {
    renderFooterSocials(DEFAULT_FOOTER_SOCIALS);
  }

  const yearNode = $("#year");
  if (yearNode) yearNode.textContent = new Date().getFullYear();

  renderEvents();
  if (isReleasesSectionVisible()) renderReleases();
  renderStreams();
  renderStudio();
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
