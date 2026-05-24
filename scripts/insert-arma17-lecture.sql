-- Лекция «АРМА 17» в раздел Радио.
-- 1) Загрузите 8 ГБ на Rutube или YouTube.
-- 2) Подставьте ссылку в stream_url ниже.
-- 3) Supabase → SQL Editor → Run.

INSERT INTO public.live_items (title, "date", place, about, poster, stream_url, lineup)
VALUES (
  'лекция про АРМА 17',
  now(),
  'НПО Мелодия',
  'Лекция про АРМА 17',
  'logo.png',
  '',  -- https://rutube.ru/video/... или https://www.youtube.com/watch?v=...
  '[]'::jsonb
);
