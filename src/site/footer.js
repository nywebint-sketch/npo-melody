import { ASSET_PREFIX } from '../logoUrls.js';
import { FOOTER_SOCIALS_FROM_DB } from '../config.js';
import { DEFAULT_FOOTER_SOCIALS } from './constants.js';
import { $ } from './dom.js';

export const resolveFooterIconUrl = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^(https?:|data:|\/|\.\/)/i.test(value)) return value;
  return ASSET_PREFIX + value.replace(/^\//, "");
};

export const normalizeFooterSocialRow = (row) => {
  if (!row || typeof row !== "object") return null;
  const url = row.url || row.href || row.link || "";
  const label = row.label || row.name || row.title || "";
  const slug = row.slug || row.key || row.id || "social";
  const iconRaw = row.icon_url ?? row.iconUrl ?? row.icon ?? "";
  if (!url || !label) return null;
  return {
    slug: String(slug),
    label: String(label),
    url: String(url),
    icon_url: resolveFooterIconUrl(iconRaw),
    sort_order: Number(row.sort_order ?? row.sortOrder ?? 0)
  };
};

export const renderFooterSocials = (items = []) => {
  const container = $("#footerSocials");
  if (!container) return;
  const rows = (Array.isArray(items) ? items : [])
    .map(normalizeFooterSocialRow)
    .filter(Boolean)
    .sort((a, b) => a.sort_order - b.sort_order);
  container.replaceChildren();
  for (const item of rows) {
    const link = document.createElement("a");
    link.className = `footer-social-btn footer-social-btn--${item.slug}`;
    link.href = item.url;
    link.setAttribute("aria-label", item.label);
    if (/^https?:/i.test(item.url)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    const icon = document.createElement("span");
    icon.className = "footer-social-icon footer-social-icon--mask";
    icon.setAttribute("aria-hidden", "true");
    if (item.icon_url) {
      const mask = `url("${item.icon_url.replace(/"/g, "%22")}")`;
      icon.style.maskImage = mask;
      icon.style.webkitMaskImage = mask;
    }
    link.appendChild(icon);
    container.appendChild(link);
  }
};

export const loadFooterSocialsFromDb = async () => {
  if (!FOOTER_SOCIALS_FROM_DB || !window.dbLayer?.getFooterSocials) {
    return DEFAULT_FOOTER_SOCIALS;
  }
  const rows = await window.dbLayer.getFooterSocials();
  return rows.length ? rows : DEFAULT_FOOTER_SOCIALS;
};
