/** Локальные статические ассеты (Vite: public/images → /images/…) */
export const LOCAL_IMAGES = "./images/";

/** Supabase Storage — постеры, мерч и прочий контент из БД */
export const ASSET_PREFIX =
  "https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/";

export const LOGO_WHITE_URL = LOCAL_IMAGES + "logo-white.png";
export const LOGO_BLACK_URL = LOCAL_IMAGES + "logo-black.png";
export const HERO_PRINT_URL = LOCAL_IMAGES + "npo_print_source.png";
export const BG_CONTOUR_URL = LOCAL_IMAGES + "bg-contour.jpg";

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
