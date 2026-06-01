/** Vite env (VITE_*) с fallback для локальной сборки без .env */
export const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL || "https://rvswpgsxutfcpgvmzonr.supabase.co"
).replace(/\/$/, "");

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c3dwZ3N4dXRmY3Bndm16b25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODQ1MTEsImV4cCI6MjA4ODY2MDUxMX0.I_XagunD2zgTVmpaOrt4SvbJbJFHAJAd2j7JpYb26oY";

export const STORAGE_BUCKET = "images";

export const BOOKING_ENDPOINT = String(import.meta.env.VITE_BOOKING_ENDPOINT || "").trim();

export const FOOTER_SOCIALS_FROM_DB = import.meta.env.VITE_FOOTER_SOCIALS_FROM_DB === "true";

export const SUPABASE_STORAGE_PUBLIC_IMAGES = `${SUPABASE_URL}/storage/v1/object/public/images/`;
