import { ASSET_PREFIX, getDefaultLogoUrl } from '../logoUrls.js';
import { el } from './dom.js';

export function setupOpenCard(node, type, id) {
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

export function createMedia(imgSrc, imgAlt, className = "media") {
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

export function resolveImageSrc(imgSrc) {
  const defaultLogo = getDefaultLogoUrl();
  const raw = String(imgSrc || "").trim();
  if (!raw || raw === "logo.png" || raw === "smile.png") return defaultLogo;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (ASSET_PREFIX) return ASSET_PREFIX + raw.replace(/^\/+/, "");
  return defaultLogo;
}

/** Изображения товаров магазина в Storage: images/microdropych/; короткие имена («vtroem.jpeg», «vtroem») собираем в полный URL. */
export function resolveMerchImageSrc(raw) {
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

