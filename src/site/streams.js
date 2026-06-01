import { getDefaultLogoUrl } from '../logoUrls.js';
import { data } from './state.js';
import { el, safeHttpUrl } from './dom.js';
import { sortAsc } from './constants.js';
import { fmtDateShort } from './format.js';
import { resolveImageSrc } from './media.js';

export const normalizeStreamUrlInput = (raw) => {
  let s = String(raw ?? "").trim();
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");
  s = s.replace(/^['"\u201C\u201D\u201E\u00AB\u00BB]+|['"\u201C\u201D\u201E\u00AB\u00BB]+$/g, "");
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (/^(youtu\.be\/|(?:www\.)?youtube\.com\/|m\.youtube\.com\/)/i.test(s)) {
    return `https://${s}`;
  }
  if (/^(?:www\.)?soundcloud\.com\//i.test(s)) {
    return `https://${s.replace(/^(?:www\.)?/i, "")}`;
  }
  return s;
};

/** Ссылка на видео/трансляцию для блока Live (Supabase: stream_url и др.) */
export const getEventStreamUrl = (eventItem) => {
  if (!eventItem) return "";
  const raw =
    eventItem.stream_url ||
    eventItem.streamUrl ||
    eventItem.video_url ||
    eventItem.videoUrl ||
    eventItem.live_url ||
    eventItem.liveUrl ||
    eventItem.embed_url ||
    eventItem.embedUrl ||
    "";
  return safeHttpUrl(normalizeStreamUrlInput(raw));
};

export const STREAM_VIDEO_EXT = /\.(mp4|webm|ogg)(\?|$)/i;
export const STREAM_HLS_EXT = /\.m3u8(\?|$)/i;

/** Эфиры с заполненной ссылкой на видео — блок «Записи» в Радио */
export const getLiveRecordings = () =>
  data.live
    .filter((e) => getEventStreamUrl(e))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

/** Преобразует публичную ссылку в iframe-embed или прямой URL для HTML5 video */
export const streamUrlToEmbed = (href) => {
  const normalized = normalizeStreamUrlInput(href);
  if (!normalized) return { kind: "none", embed: "", video: "" };
  try {
    const u = new URL(normalized);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const seg = u.pathname.replace(/^\//, "").split("/").filter(Boolean)[0] || "";
      const id = decodeURIComponent(seg).replace(/\/$/, "");
      if (id) return { kind: "iframe", embed: `https://www.youtube.com/embed/${encodeURIComponent(id)}`, video: "" };
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "m.youtube.com") {
      if (u.pathname.startsWith("/embed/")) return { kind: "iframe", embed: u.href.split(/[?#]/)[0], video: "" };
      const v = u.searchParams.get("v");
      if (v) return { kind: "iframe", embed: `https://www.youtube.com/embed/${encodeURIComponent(v)}`, video: "" };
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts) return { kind: "iframe", embed: `https://www.youtube.com/embed/${encodeURIComponent(shorts[1])}`, video: "" };
    }
    if (host.endsWith("vimeo.com")) {
      const m = u.pathname.match(/\/(\d+)/);
      if (m) return { kind: "iframe", embed: `https://player.vimeo.com/video/${m[1]}`, video: "" };
    }
    if (host.endsWith("rutube.ru")) {
      const m = u.pathname.match(/\/video\/([a-f0-9]{32})/i);
      if (m) return { kind: "iframe", embed: `https://rutube.ru/play/embed/${m[1]}`, video: "" };
    }
    if (host === "vk.com" || host === "vkvideo.ru") {
      const m = u.pathname.match(/\/video(-?\d+)_(\d+)/i);
      if (m) {
        return {
          kind: "iframe",
          embed: `https://vk.com/video_ext.php?oid=${encodeURIComponent(m[1])}&id=${encodeURIComponent(m[2])}&hd=2`,
          video: ""
        };
      }
    }
    if (host === "kinescope.io") {
      const m = u.pathname.match(/\/embed\/([^/?]+)/i);
      if (m) return { kind: "iframe", embed: `https://kinescope.io/embed/${m[1]}`, video: "" };
    }
    if (host === "soundcloud.com" || host === "on.soundcloud.com") {
      const path = u.pathname.replace(/\/$/, "");
      const parts = path.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const trackUrl = `https://soundcloud.com/${parts.join("/")}`;
        const player = new URL("https://w.soundcloud.com/player/");
        player.searchParams.set("url", trackUrl);
        player.searchParams.set("auto_play", "false");
        player.searchParams.set("hide_related", "true");
        player.searchParams.set("show_comments", "false");
        player.searchParams.set("show_user", "true");
        player.searchParams.set("show_reposts", "false");
        player.searchParams.set("visual", "true");
        return { kind: "iframe", embed: player.href, video: "" };
      }
    }

    if (STREAM_HLS_EXT.test(u.pathname) || STREAM_HLS_EXT.test(normalized)) {
      return { kind: "hls", embed: "", video: normalized };
    }

    if (STREAM_VIDEO_EXT.test(u.pathname) || STREAM_VIDEO_EXT.test(normalized)) {
      return { kind: "video", embed: "", video: normalized };
    }

    if (/\/embed\//i.test(u.pathname) || host.startsWith("player.")) {
      return { kind: "iframe", embed: normalized, video: "" };
    }

    return { kind: "none", embed: "", video: "" };
  } catch {
    return { kind: "none", embed: "", video: "" };
  }
};

/** Превью для карточки: YouTube / Rutube или постер из админки */
export const getRadioThumbUrl = (eventItem) => {
  const fallback = getDefaultLogoUrl();
  const posterRaw = String(eventItem?.poster || "").trim();
  const poster =
    posterRaw && posterRaw !== "logo.png" && posterRaw !== "smile.png" ? resolveImageSrc(posterRaw) : fallback;

  const streamUrl = getEventStreamUrl(eventItem);
  if (!streamUrl) return poster;

  try {
    const u = new URL(streamUrl);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/").filter(Boolean)[0];
      if (id) return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://i.ytimg.com/vi/${encodeURIComponent(v)}/hqdefault.jpg`;
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts) return `https://i.ytimg.com/vi/${encodeURIComponent(shorts[1])}/hqdefault.jpg`;
      const embed = u.pathname.match(/\/embed\/([^/?]+)/);
      if (embed) return `https://i.ytimg.com/vi/${encodeURIComponent(embed[1])}/hqdefault.jpg`;
    }
    if (host.endsWith("rutube.ru")) {
      const m = u.pathname.match(/\/video\/([a-f0-9]{32})/i);
      if (m) return `https://pic.rutube.ru/${m[1]}.jpg`;
    }
  } catch {
    /* ignore */
  }

  return poster;
};

/** Карточка эфира / записи в стиле YouTube */
export const buildRadioYtCard = (eventItem, { thumbBadge = "", statsLine = "" } = {}) => {
  const card = el("div", { className: "radio-yt-card" });

  const thumb = el("div", { className: "radio-yt-card__thumb" });
  const img = document.createElement("img");
  img.className = "radio-yt-card__thumb-img";
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  const thumbFallback = getDefaultLogoUrl();
  img.src = getRadioThumbUrl(eventItem);
  img.onerror = function onThumbError() {
    this.onerror = null;
    if (this.src !== thumbFallback) this.src = thumbFallback;
  };
  thumb.appendChild(img);
  const streamUrl = getEventStreamUrl(eventItem);
  if (/soundcloud\.com/i.test(streamUrl)) {
    const oembedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(streamUrl)}`;
    fetch(oembedUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const art = data?.thumbnail_url;
        if (art) img.src = art.replace("-large.jpg", "-t500x500.jpg");
      })
      .catch(() => {});
  }
  if (thumbBadge) {
    thumb.appendChild(el("span", { className: "radio-yt-card__badge", text: thumbBadge }));
  }
  card.appendChild(thumb);

  const info = el("div", { className: "radio-yt-card__info" });
  const textCol = el("div", { className: "radio-yt-card__text" });
  textCol.appendChild(el("h3", { className: "radio-yt-card__title", text: eventItem.title || "—" }));
  if (statsLine) {
    textCol.appendChild(el("p", { className: "radio-yt-card__stats", text: statsLine }));
  }
  info.appendChild(textCol);

  card.appendChild(info);
  return card;
};
