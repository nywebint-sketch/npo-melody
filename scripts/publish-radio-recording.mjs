/**
 * Публикация записи в раздел «Радио» (таблица live_items).
 *
 * Вариант A — вставка через service role (рекомендуется для скриптов):
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/publish-radio-recording.mjs \
 *     --title "лекция про АРМА 17" \
 *     --url "https://rutube.ru/video/XXXXXXXX"
 *
 * Вариант B — без ключа скрипт выведет SQL для Supabase SQL Editor.
 *
 * Вариант C — админка → НПО РАДИО → новый эфир, вставить ссылку на видео.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rvswpgsxutfcpgvmzonr.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c3dwZ3N4dXRmY3Bndm16b25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODQ1MTEsImV4cCI6MjA4ODY2MDUxMX0.I_XagunD2zgTVmpaOrt4SvbJbJFHAJAd2j7JpYb26oY';

const parseArgs = () => {
  const out = { title: '', url: '', about: '', place: 'НПО Мелодия' };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--title' && argv[i + 1]) out.title = argv[++i];
    else if (a === '--url' && argv[i + 1]) out.url = argv[++i];
    else if (a === '--about' && argv[i + 1]) out.about = argv[++i];
    else if (a === '--place' && argv[i + 1]) out.place = argv[++i];
  }
  return out;
};

const { title, url, about, place } = parseArgs();

if (!title) {
  console.error('Укажите --title "лекция про АРМА 17"');
  process.exit(1);
}

const payload = {
  title,
  date: new Date().toISOString(),
  place,
  about: about || title,
  poster: 'logo.png',
  stream_url: url || '',
  lineup: []
};

const sqlQuote = (s) => `'${String(s).replace(/'/g, "''")}'`;

const sql = `-- Вставка записи в Радио (выполнить в Supabase → SQL Editor)
INSERT INTO public.live_items (title, "date", place, about, poster, stream_url, lineup)
VALUES (
  ${sqlQuote(payload.title)},
  now(),
  ${sqlQuote(payload.place)},
  ${sqlQuote(payload.about)},
  'logo.png',
  ${sqlQuote(payload.stream_url)},
  '[]'::jsonb
);
`;

const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!url) {
  console.warn('Ссылка --url не задана. Сначала загрузите 8 ГБ на Rutube/YouTube, затем запустите снова с --url.\n');
  console.log(sql);
  process.exit(0);
}

const client = createClient(SUPABASE_URL, SUPABASE_KEY);

const { data, error } = await client.from('live_items').insert(payload).select().single();

if (error) {
  if (!hasServiceRole && /policy|permission|JWT|row-level/i.test(error.message || '')) {
    console.error('Нет прав на INSERT (нужен SUPABASE_SERVICE_ROLE_KEY или выполните SQL вручную):\n');
    console.log(sql);
    process.exit(1);
  }
  console.error('Ошибка Supabase:', error.message);
  process.exit(1);
}

console.log('Запись опубликована:', data.id, '—', data.title);
if (data.stream_url) console.log('Видео:', data.stream_url);
