-- =============================================================================
-- НПО Мелодия — Supabase: соцсети в футере (иконки + ссылки)
-- Как выполнить: Dashboard → SQL Editor → New query → вставить → Run
-- Иконки: Storage → bucket `images` (tg.png, vk.png, ig.png, sc.png)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.footer_socials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  url text NOT NULL,
  icon_url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.footer_socials IS 'Ссылки и иконки соцсетей в футере сайта';
COMMENT ON COLUMN public.footer_socials.slug IS 'Ключ для CSS-модификатора (telegram, vk, email, …)';
COMMENT ON COLUMN public.footer_socials.icon_url IS 'Полный URL или путь в bucket images (например tg.png)';

CREATE INDEX IF NOT EXISTS footer_socials_sort_idx ON public.footer_socials (sort_order);

ALTER TABLE public.footer_socials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "footer_socials_select_public" ON public.footer_socials;
CREATE POLICY "footer_socials_select_public"
  ON public.footer_socials
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "footer_socials_insert_authenticated" ON public.footer_socials;
CREATE POLICY "footer_socials_insert_authenticated"
  ON public.footer_socials
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "footer_socials_update_authenticated" ON public.footer_socials;
CREATE POLICY "footer_socials_update_authenticated"
  ON public.footer_socials
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "footer_socials_delete_authenticated" ON public.footer_socials;
CREATE POLICY "footer_socials_delete_authenticated"
  ON public.footer_socials
  FOR DELETE
  TO authenticated
  USING (true);

-- Начальные данные
INSERT INTO public.footer_socials (slug, label, url, icon_url, sort_order)
VALUES
  ('telegram', 'Telegram', 'https://t.me/npo_melody', 'https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/tg.png', 10),
  ('vk', 'ВКонтакте', 'https://vk.com/npo_melody', 'https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/vk.png', 20),
  ('instagram', 'Instagram', 'https://www.instagram.com/npo_melody/', 'https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/ig.png', 30),
  ('soundcloud', 'SoundCloud', 'https://soundcloud.com/npo_radio', 'https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/sc.png', 40),
  ('email', 'Почта', 'mailto:npomelodia@yandex.ru', './images/icon-email.svg', 50)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  url = EXCLUDED.url,
  icon_url = EXCLUDED.icon_url,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
