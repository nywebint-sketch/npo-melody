import { $, $$, el } from './dom.js';
import { clubSession, setClubSession } from './state.js';
import { renderStreams } from './catalog.js';
import { closeModal, closeExclusivePanel } from './modals.js';

export const CLUB_TOKEN_KEY = "npo_club_token_v1";
export const CLUB_API_BASE = window.location.protocol === "file:" ? "http://localhost:8000" : "";

export const readClubToken = () => localStorage.getItem(CLUB_TOKEN_KEY) || "";
export const saveClubToken = (token) => {
  if (!token) {
    localStorage.removeItem(CLUB_TOKEN_KEY);
    return;
  }
  localStorage.setItem(CLUB_TOKEN_KEY, token);
};

export const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const clubApiUrl = (path) => `${CLUB_API_BASE}${path}`;

export const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const clubRequest = async (path, { method = "GET", body = null, auth = true } = {}) => {
  const headers = { "Content-Type": "application/json" };
  const token = readClubToken();
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(clubApiUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    const message = payload?.error || payload?.message || "Ошибка запроса";
    throw new Error(message);
  }
  return payload || {};
};

export function renderExclusiveItems(items = []) {
  const exclusiveContent = $("#exclusiveContent");
  if (!exclusiveContent) return;
  exclusiveContent.replaceChildren();

  items.forEach((item) => {
    const card = el("div", { className: "card pad" });
    card.appendChild(el("b", { text: item.title || "Эксклюзив" }));
    const desc = el("div", { className: "muted", text: item.description || "" });
    desc.style.marginTop = "6px";
    card.appendChild(desc);
    exclusiveContent.appendChild(card);
  });
}

export function renderClubAccess() {
  const authGuest = $("#authGuest");
  const authMember = $("#authMember");
  const memberName = $("#memberName");
  const authStatus = $("#authStatus");
  const exclusiveContent = $("#exclusiveContent");
  const exclusiveSection = $("#exclusive");

  const userIsAuthenticated = Boolean(clubSession?.email);

  if (authGuest) authGuest.style.display = userIsAuthenticated ? "none" : "grid";
  if (authMember) authMember.style.display = userIsAuthenticated ? "block" : "none";
  if (memberName) memberName.textContent = clubSession?.name || clubSession?.email || "участник";

  /* Раздел «Эксклюзив» временно скрыт на сайте; контент для модалки профиля по-прежнему заполняется при входе. */
  if (exclusiveSection) exclusiveSection.setAttribute("hidden", "");
  if (exclusiveContent) exclusiveContent.style.display = userIsAuthenticated ? "" : "none";

  if (authStatus) {
    authStatus.textContent = userIsAuthenticated
      ? ""
      : "Доступ к эксклюзиву закрыт.";
  }

  // When authenticated: hide profile section from page (no scroll); content only in modal
  // Секция авторизации/регистрации не в прокрутке — только модалка по кнопке «Вход»
  const profileSection = document.getElementById("profile");
  if (profileSection) {
    profileSection.style.display = "none";
  }

  // При отсутствии авторизации: только «Вход», кнопка с картинкой профиля скрыта. При авторизации — наоборот.
  const loginForms = $$(".login-form, .register-form");
  const loginRegisterButtons = $$(".login-register-buttons");
  const profileButtons = $$(".profile-button");
  const authOpenButtons = $$(".auth-open-button");

  loginForms.forEach((el) => { el.style.display = userIsAuthenticated ? "none" : ""; });
  loginRegisterButtons.forEach((el) => { el.style.display = userIsAuthenticated ? "none" : "grid"; });

  authOpenButtons.forEach((el) => {
    el.style.display = userIsAuthenticated ? "none" : "";
    if (userIsAuthenticated) el.setAttribute("hidden", "");
    else el.removeAttribute("hidden");
  });
  profileButtons.forEach((el) => {
    el.style.display = userIsAuthenticated ? "" : "none";
    if (userIsAuthenticated) {
      el.removeAttribute("hidden");
    } else {
      el.setAttribute("hidden", "");
    }
  });

  $$(".nav-club-logout").forEach((el) => {
    el.style.display = userIsAuthenticated ? "" : "none";
    if (userIsAuthenticated) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  });
}

export function setClubStatus(message) {
  const authStatus = $("#authStatus");
  if (authStatus && message) authStatus.textContent = message;
}

export async function refreshClubSession() {
  try {
    const session = await window.dbLayer.getSession();
    if (!session) {
      setClubSession(null);
      renderClubAccess();
      return;
    }

    setClubSession({
      email: session.user.email,
      name: session.user.user_metadata?.name || session.user.email
    });

    // Тут можно в будущем брать эксклюзивный контент из базы
    const mockExclusive = [
      { title: 'Early Access: NPO VA 002', description: 'Превью треков + закрытый pre-save.' },
      { title: 'Private Stream Archive', description: 'Закрытые записи из ночных сетов.' },
      { title: 'Members Promo Code', description: 'Скидка 15% в магазине и на закрытые дропы.' }
    ];
    renderExclusiveItems(mockExclusive);
    renderClubAccess();
  } catch (err) {
    console.error(err);
    setClubSession(null);
    renderClubAccess();
  }
}

export function initClubAuth() {
  const registerForm = $("#registerForm");
  const loginForm = $("#loginForm");
  const logoutBtn = $("#logoutBtn");

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = String(form.elements.name?.value || "").trim();
    const email = normalizeEmail(form.elements.email?.value);
    const password = String(form.elements.password?.value || "");
    const password2 = String(form.elements.password2?.value || "");

    if (!name || name.length < 2) {
      setClubStatus("Имя должно быть не короче 2 символов.");
      return;
    }
    if (!isValidEmail(email)) {
      setClubStatus("Укажи корректный email.");
      return;
    }
    if (password.length < 6) {
      setClubStatus("Пароль должен быть не короче 6 символов.");
      return;
    }
    if (password !== password2) {
      setClubStatus("Пароли не совпадают.");
      return;
    }

    try {
      await window.dbLayer.register(email, password, name);
      // После регистрации Supabase автоматически логинит, берем сессию
      const session = await window.dbLayer.getSession();
      setClubSession({ email: session.user.email, name: session.user.user_metadata?.name || name });
      form.reset();

      const mockExclusive = [
        { title: 'Early Access: NPO VA 002', description: 'Превью треков + закрытый pre-save.' },
        { title: 'Private Stream Archive', description: 'Закрытые записи из ночных сетов.' },
        { title: 'Members Promo Code', description: 'Скидка 15% в магазине и на закрытые дропы.' }
      ];
      renderExclusiveItems(mockExclusive);
      renderStreams();
      renderClubAccess();
      setClubStatus("Регистрация успешна. Эксклюзив открыт.");
      closeModal();
    } catch (err) {
      setClubStatus(err.message || "Ошибка регистрации.");
    }
  });

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = normalizeEmail(form.elements.email?.value);
    const password = String(form.elements.password?.value || "");

    if (!isValidEmail(email) || !password) {
      setClubStatus("Укажи email и пароль.");
      return;
    }

    try {
      await window.dbLayer.login(email, password);
      const session = await window.dbLayer.getSession();
      setClubSession({ email: session.user.email, name: session.user.user_metadata?.name || email });
      form.reset();

      const mockExclusive = [
        { title: 'Early Access: NPO VA 002', description: 'Превью треков + закрытый pre-save.' },
        { title: 'Private Stream Archive', description: 'Закрытые записи из ночных сетов.' },
        { title: 'Members Promo Code', description: 'Скидка 15% в магазине и на закрытые дропы.' }
      ];
      renderExclusiveItems(mockExclusive);
      renderStreams();
      renderClubAccess();
      closeModal();
    } catch (err) {
      setClubStatus(err.message || "Неверный email или пароль.");
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    try {
      await window.dbLayer.logout();
    } catch {
      // ignore
    }
    setClubSession(null);
    renderStreams();
    closeExclusivePanel();
    renderClubAccess();
    setClubStatus("Ты вышел из аккаунта.");
  });
}
