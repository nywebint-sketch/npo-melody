-- WEI b2b BE — kompromissed (SoundCloud) в раздел «Радио».
-- Supabase → SQL Editor → Run (если скрипт publish-radio-recording.mjs недоступен).

INSERT INTO public.live_items (title, "date", place, about, poster, stream_url, lineup)
VALUES (
  'WEI b2b BE — kompromissed',
  now(),
  'Renegade Radio Camp',
  'https://soundcloud.com/renegaderadiocamp/wei_b2b_be_kompromissed',
  'logo.png',
  'https://soundcloud.com/renegaderadiocamp/wei_b2b_be_kompromissed',
  '[]'::jsonb
);
