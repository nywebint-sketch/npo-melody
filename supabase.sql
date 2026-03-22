-- =============================================================================
-- НПО Мелодия — Supabase: таблица live_items (секция Live на сайте)
-- Как выполнить: Dashboard → SQL Editor → New query → вставить весь файл → Run
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.live_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  "date" timestamptz NOT NULL,
  place text,
  about text,
  poster text,
  stream_url text,
  lineup jsonb NOT NULL DEFAULT '[]'::jsonb
);

COMMENT ON TABLE public.live_items IS 'Предстоящие эфиры для блока Live на главной';

CREATE INDEX IF NOT EXISTS live_items_date_idx ON public.live_items ("date");

ALTER TABLE public.live_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_items_select_public" ON public.live_items;
CREATE POLICY "live_items_select_public"
  ON public.live_items
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "live_items_insert_authenticated" ON public.live_items;
CREATE POLICY "live_items_insert_authenticated"
  ON public.live_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "live_items_update_authenticated" ON public.live_items;
CREATE POLICY "live_items_update_authenticated"
  ON public.live_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "live_items_delete_authenticated" ON public.live_items;
CREATE POLICY "live_items_delete_authenticated"
  ON public.live_items
  FOR DELETE
  TO authenticated
  USING (true);

-- -----------------------------------------------------------------------------
-- Данные: скрипт выше создаёт только таблицу. Чтобы на сайте появились эфиры:
--   • админ-панель → раздел «Live» → «+ Добавить эфир» (дата должна быть в будущем)
--   • или выполните в SQL Editor отдельным запросом (подставьте свои название и дату):
-- -----------------------------------------------------------------------------
--
-- INSERT INTO public.live_items (title, "date", place, about, stream_url)
-- VALUES (
--   'Мой эфир',
--   (now() AT TIME ZONE 'Europe/Moscow') + interval '5 days',
--   'НПО Мелодия',
--   'Описание',
--   ''
-- );
