-- Выполни в Supabase: SQL Editor → New query → Run.
-- Сначала посмотри строки и id (важно: title у вас может быть не «Микродроп…», а например «T-shirt NPO»):
-- SELECT id, title, poster, images FROM merch;

-- Обновление по точному названию (подставь свой title из SELECT, если отличается):
UPDATE merch
SET
  poster = 'https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/vtroem.jpeg',
  images = '["https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/vtroem.jpeg","https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/photo_2026-03-14%2023.42.51.jpeg","https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/photo_2026-03-14%2023.42.47.jpeg"]'::jsonb
WHERE title = 'T-shirt NPO';

-- Если строка одна, можно без WHERE title (осторожно при нескольких товарах):
-- UPDATE merch SET poster = 'https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/vtroem.jpeg', images = '["https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/vtroem.jpeg","https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/photo_2026-03-14%2023.42.51.jpeg","https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/photo_2026-03-14%2023.42.47.jpeg"]'::jsonb;

-- Альтернатива по id (скопируй id из SELECT):
-- UPDATE merch SET poster = 'https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/vtroem.jpeg', images = '["https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/vtroem.jpeg","https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/photo_2026-03-14%2023.42.51.jpeg","https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/photo_2026-03-14%2023.42.47.jpeg"]'::jsonb WHERE id = 'cb392559-1d0c-4c02-9caa-5c9a08f891a0';
