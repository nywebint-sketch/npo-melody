-- Выполни в Supabase: SQL Editor → New query → вставь и Run.
-- Таблица merch: id, title, price, status, desc, poster, created_at [, images [, preorder_url ]]
-- Колонка называется "desc", не description. Для карусели — images (jsonb).
-- Ссылка на предзаказ — preorder_url (text). Добавить колонку один раз:
-- ALTER TABLE merch ADD COLUMN IF NOT EXISTS preorder_url text;

INSERT INTO merch (title, "desc", poster, images)
VALUES (
  'Микродроп НПО Мелодия 🎵',
  'Готовим в Принтмафии микродропыч для НПО Мелодия 🎵

Футболки — Марина Бибик, принты — Лофер',
  'https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/photo_2026-03-14%2023.42.47.jpeg',
  '["https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/photo_2026-03-14%2023.42.47.jpeg","https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/photo_2026-03-14%2023.42.51.jpeg","https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/photo_2026-03-14%2023.42.54.jpeg","https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/photo_2026-03-14%2023.43.12.jpeg"]'::jsonb
);
