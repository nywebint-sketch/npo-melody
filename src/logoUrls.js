/** Supabase public images base + theme-aware default logo */
export const ASSET_PREFIX =
  "https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/";

/** Светлый знак — для тёмного фона / тёмной темы */
export const LOGO_WHITE_URL = ASSET_PREFIX + "logo%20white.png";
/** Знак для светлой темы — `logo black.png` в Storage (чёрный контур, прозрачный фон) */
export const LOGO_BLACK_URL = ASSET_PREFIX + "logo%20black.png";

export function getDefaultLogoUrl() {
  try {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return LOGO_WHITE_URL;
    }
  } catch (_) {
    /* ignore */
  }
  return LOGO_BLACK_URL;
}
