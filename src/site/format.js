import { pad2 } from "./dom.js";

const monthsRu = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

export const fmtDT = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export const fmtDateShort = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${monthsRu[d.getMonth()]}`;
};

export const fmtDateDots = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
};

const weekdaysRuShort = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];

/** Дата в стиле dexclub.net: «СБ 30.05» */
export const fmtDateDex = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${weekdaysRuShort[d.getDay()]} ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
};

export const recordsCountRu = (n) => {
  const num = Number(n);
  const x = Math.abs(num) % 100;
  const d = x % 10;
  if (x > 10 && x < 20) return `${num} записей`;
  if (d === 1) return `${num} запись`;
  if (d >= 2 && d <= 4) return `${num} записи`;
  return `${num} записей`;
};
