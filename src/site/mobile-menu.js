import { $, $$ } from "./dom.js";

export const mobileMenuToggle = $("#mobileMenuToggle");
export const mobileMenu = $("#mobileMenu");
export const mobileMenuBackdrop = $("#mobileMenuBackdrop");
export const mobileLinks = $$("#mobileMenu a");
export const mobileBp = window.matchMedia("(max-width: 980px)");

export function closeMobileMenu() {
  mobileMenuToggle?.setAttribute("aria-expanded", "false");
  mobileMenuToggle?.setAttribute("aria-label", "Открыть меню");
  if (mobileMenu) mobileMenu.hidden = true;
  if (mobileMenuBackdrop) mobileMenuBackdrop.hidden = true;
  document.body.classList.remove("menu-open");
}

export function openMobileMenu() {
  document.body.classList.add("menu-open");
  if (mobileMenu) mobileMenu.hidden = false;
  if (mobileMenuBackdrop) mobileMenuBackdrop.hidden = false;
  mobileMenuToggle?.setAttribute("aria-expanded", "true");
  mobileMenuToggle?.setAttribute("aria-label", "Закрыть меню");
}
