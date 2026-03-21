-- Supabase → SQL Editor → New query → Run (можно целиком).
-- Таблица streams: id, title, дата, опционально обложка для модалки.

-- 1) Таблица (если уже есть — шаг выдаст notice, можно закомментировать блок)
CREATE TABLE IF NOT EXISTS public.streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  "date" timestamptz NOT NULL,
  cover text,
  poster text,
  image text
);

COMMENT ON TABLE public.streams IS 'Архив Live / записи для сайта';

-- 2) RLS: сайт читает через anon key — нужна политика SELECT
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "streams_select_public" ON public.streams;
CREATE POLICY "streams_select_public"
  ON public.streams
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Вставка/обновление из кода под сервисной ролью или из SQL Editor (роль postgres) — при необходимости добавь отдельные политики.

-- 3) Данные (дубликаты по title+date не проверяем — при повторном Run будут новые строки)
INSERT INTO public.streams (title, "date")
VALUES
  ('NPO Radio — ночной сет (фрагмент)', '2026-03-15T20:00:00+03'),
  ('Live из клуба — warmup', '2026-03-08T22:00:00+03'),
  ('Архив: гостевой микс', '2026-03-01T21:00:00+03');
