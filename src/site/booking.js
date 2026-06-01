import { BOOKING_ENDPOINT } from '../config.js';
import { $ } from './dom.js';
import { safeHttpUrl } from './dom.js';

export const BOOKING_COOLDOWN_MS = 60 * 1000;
export const BOOKING_MIN_FILL_MS = 3000;
export const BOOKING_REQUEST_TIMEOUT_MS = 12000;
export const BOOKING_KEY = "npo_booking_last_submit_ts";

export const validateText = (value, { min = 2, max = 120, pattern = null } = {}) => {
  const str = String(value || "").trim();
  if (str.length < min || str.length > max) return false;
  if (str.includes("<") || str.includes(">")) return false;
  if (pattern && !pattern.test(str)) return false;
  return true;
};

export const validateBookingPayload = (payload) => {
  if (!validateText(payload.date, { min: 4, max: 40 })) return "Укажи корректную дату";
  if (!validateText(payload.city, { min: 2, max: 80 })) return "Укажи корректный город";
  if (!validateText(payload.venue, { min: 2, max: 120 })) return "Укажи корректную площадку";
  if (!validateText(payload.format, { min: 2, max: 40 })) return "Укажи корректный формат";
  if (!validateText(payload.contacts, { min: 4, max: 120 })) return "Укажи корректные контакты";
  if (!validateText(payload.artistName, { min: 1, max: 80 })) return "Некорректный артист";
  if (payload.note && !validateText(payload.note, { min: 0, max: 500 })) return "Комментарий слишком длинный";
  return "";
};

export const getBookingCooldownLeft = () => {
  const last = Number(localStorage.getItem(BOOKING_KEY) || 0);
  if (!last) return 0;
  return Math.max(0, BOOKING_COOLDOWN_MS - (Date.now() - last));
};

document.addEventListener("submit", async (e) => {
  const bookingForm = e.target.closest(".booking-form-modal");
  if (!bookingForm) return;
  e.preventDefault();

  const bookingStatus = $(".booking-status", bookingForm);
  const bookingSubmit = bookingForm.querySelector('button[type="submit"]');

  const endpoint = safeHttpUrl(BOOKING_ENDPOINT);
  if (!endpoint) {
    if (bookingStatus) bookingStatus.textContent = "Отправка заявок временно недоступна";
    return;
  }

  if (bookingForm.dataset.artistBookable !== "1") {
    if (bookingStatus) bookingStatus.textContent = "Этот артист сейчас не на букинге";
    return;
  }

  const honeypotValue = bookingForm.elements.website?.value?.trim();
  if (honeypotValue) {
    if (bookingStatus) bookingStatus.textContent = "Заявка отклонена";
    return;
  }

  const renderedAt = Number(bookingForm.dataset.renderedAt || 0);
  if (Date.now() - renderedAt < BOOKING_MIN_FILL_MS) {
    if (bookingStatus) bookingStatus.textContent = "Слишком быстро. Проверь форму и отправь снова.";
    return;
  }

  const cooldownLeft = getBookingCooldownLeft();
  if (cooldownLeft > 0) {
    if (bookingStatus) bookingStatus.textContent = `Подожди ${Math.ceil(cooldownLeft / 1000)} сек перед повторной отправкой`;
    return;
  }

  const payload = {
    artistId: bookingForm.dataset.artistId || "",
    artistName: bookingForm.dataset.artistName || "",
    date: bookingForm.elements.date.value.trim(),
    city: bookingForm.elements.city.value.trim(),
    venue: bookingForm.elements.venue.value.trim(),
    format: bookingForm.elements.format.value.trim(),
    contacts: bookingForm.elements.contacts.value.trim(),
    note: bookingForm.elements.note.value.trim(),
    source: "npo-melodiya-site",
    createdAt: new Date().toISOString(),
    userAgent: navigator.userAgent
  };

  const validationError = validateBookingPayload(payload);
  if (validationError) {
    if (bookingStatus) bookingStatus.textContent = validationError;
    return;
  }

  if (bookingStatus) bookingStatus.textContent = "Отправка...";
  if (bookingSubmit) bookingSubmit.disabled = true;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BOOKING_REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    localStorage.setItem(BOOKING_KEY, String(Date.now()));
    if (bookingStatus) bookingStatus.textContent = "Заявка отправлена в админку";
    bookingForm.reset();
    bookingForm.dataset.renderedAt = String(Date.now());
  } catch (err) {
    if (bookingStatus) bookingStatus.textContent = "Ошибка отправки. Попробуй позже.";
    console.error(err);
  } finally {
    clearTimeout(timeout);
    if (bookingSubmit) bookingSubmit.disabled = false;
  }
});
