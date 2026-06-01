import { $ } from "./dom.js";
import { closeModal, closeExclusivePanel, exclusivePanel, goToHomeScreen } from "./modals.js";
import {
  closeMobileMenu,
  mobileBp,
  mobileLinks,
  mobileMenuBackdrop,
  mobileMenuToggle,
  openMobileMenu
} from "./mobile-menu.js";

export const brandHomeLink = $("#brandHomeLink");

brandHomeLink?.addEventListener("click", (e) => {
  e.preventDefault();
  const next = new URL(brandHomeLink.getAttribute("href") || "./", window.location.href);
  next.hash = "";
  const here = new URL(window.location.href);
  here.hash = "";
  if (String(next.pathname) === String(here.pathname) && String(next.search) === String(here.search)) {
    goToHomeScreen();
    return;
  }
  window.location.assign(next.href);
});

mobileMenuToggle?.addEventListener("click", (e) => {
  e.preventDefault();
  if (document.body.classList.contains("menu-open")) closeMobileMenu();
  else openMobileMenu();
});

mobileMenuBackdrop?.addEventListener("click", closeMobileMenu);
mobileLinks.forEach((link) => link.addEventListener("click", closeMobileMenu));

window.addEventListener("resize", () => {
  if (!mobileBp.matches) closeMobileMenu();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeMobileMenu();
    if (exclusivePanel && !exclusivePanel.hidden) {
      closeExclusivePanel();
    }
    closeModal();
  }
});
