import { FOOTER_ICONS, LOCAL_IMAGES } from "../logoUrls.js";

export const EVENTS_VISIBLE_LIMIT = 3;

export const STUDIO_SERVICES = [
  {
    id: "vinyl-wash",
    title: "мойка пластинок",
    about:
      "Бережная очистка винила от пыли и статики. Подходит для домашней коллекции и пластинок перед эфиром или сетом."
  },
  {
    id: "set-recording",
    title: "запись сета",
    about:
      "Запись DJ-сета в студии: подготовка сигнала, контроль уровня и экспорт в удобном формате для публикации или архива."
  },
  {
    id: "mastering",
    title: "мастеринг",
    about:
      "Финальная обработка трека под стриминг и релиз: баланс, громкость и проверка на разных системах воспроизведения."
  },
  {
    id: "mixing",
    title: "сведение",
    about:
      "Сведение мультитрека: баланс партий, пространство, динамика и подготовка материала к мастерингу."
  },
  {
    id: "lessons",
    title: "уроки DJ и продакшена",
    about:
      "Индивидуальные занятия по DJ-технике и основам продакшена — от первых шагов до подготовки к выступлению."
  }
];

export const STUDIO_CONTACT_URL = "https://t.me/npo_melody";

export const sortAsc = (arr, key) => [...arr].sort((a, b) => new Date(a[key]) - new Date(b[key]));

export const DEFAULT_FOOTER_SOCIALS = [
  { slug: "telegram", label: "Telegram", url: "https://t.me/npo_melody", icon_url: FOOTER_ICONS.telegram, sort_order: 10 },
  { slug: "vk", label: "ВКонтакте", url: "https://vk.com/npo_melody", icon_url: FOOTER_ICONS.vk, sort_order: 20 },
  { slug: "instagram", label: "Instagram", url: "https://www.instagram.com/npo_melody/", icon_url: FOOTER_ICONS.instagram, sort_order: 30 },
  { slug: "soundcloud", label: "SoundCloud", url: "https://soundcloud.com/npo_radio", icon_url: FOOTER_ICONS.soundcloud, sort_order: 40 },
  { slug: "email", label: "Почта", url: "mailto:npomelodia@yandex.ru", icon_url: `${LOCAL_IMAGES}icon-email.svg`, sort_order: 50 }
];
