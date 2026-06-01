import { $, el } from './dom.js';

export function showToast(message, { duration = 4500 } = {}) {
  let host = document.getElementById("siteToastHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "siteToastHost";
    host.className = "site-toast-host";
    document.body.appendChild(host);
  }
  const node = document.createElement("div");
  node.className = "site-toast";
  node.setAttribute("role", "status");
  node.textContent = message;
  host.appendChild(node);
  requestAnimationFrame(() => node.classList.add("site-toast--visible"));
  let tmr = window.setTimeout(() => {
    node.classList.remove("site-toast--visible");
    window.setTimeout(() => node.remove(), 220);
  }, duration);
  node.addEventListener("click", () => {
    window.clearTimeout(tmr);
    node.classList.remove("site-toast--visible");
    window.setTimeout(() => node.remove(), 220);
  });
}

document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-placeholder-link]");
  if (link) {
    e.preventDefault();
    showToast(link.dataset.placeholderLink || "Поставь ссылку");
  }
});

export function renderSkeletonGrid(selector, count = 4, variant = "default") {
  const wrap = $(selector);
  if (!wrap) return;
  wrap.replaceChildren();

  for (let i = 0; i < count; i += 1) {
    const card = el("div", { className: `card skeleton-card ${variant === "row" ? "skeleton-row" : ""}` });

    const media = el("div", { className: "media skeleton skeleton-media" });
    card.appendChild(media);

    const pad = el("div", { className: "pad" });
    const line1 = el("div", { className: "skeleton skeleton-line skeleton-line-lg" });
    const line2 = el("div", { className: "skeleton skeleton-line skeleton-line-sm" });
    pad.appendChild(line1);
    pad.appendChild(line2);
    card.appendChild(pad);

    wrap.appendChild(card);
  }
}
