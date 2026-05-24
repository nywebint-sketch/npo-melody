/**
 * Загрузка SVG/PNG иконок футера в Supabase Storage (bucket images, папка footer/).
 * Запуск: node scripts/upload-footer-icons.mjs
 */
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const SUPABASE_URL = 'https://rvswpgsxutfcpgvmzonr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c3dwZ3N4dXRmY3Bndm16b25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODQ1MTEsImV4cCI6MjA4ODY2MDUxMX0.I_XagunD2zgTVmpaOrt4SvbJbJFHAJAd2j7JpYb26oY';

const __dirname = dirname(fileURLToPath(import.meta.url));
const imagesDir = join(__dirname, '../public/images');

const files = [
  'icon-telegram.svg',
  'icon-vk.svg',
  'icon-instagram.svg',
  'icon-soundcloud.svg',
  'icon-email.svg'
];

const mimeFor = (name) => (name.endsWith('.svg') ? 'image/svg+xml' : 'image/png');

for (const name of files) {
  const body = await readFile(join(imagesDir, name));
  const path = `footer/${name}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/images/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': mimeFor(name),
      'x-upsert': 'true'
    },
    body
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`FAIL ${path}:`, res.status, text);
    process.exitCode = 1;
    continue;
  }
  console.log(`OK ${path} → ${SUPABASE_URL}/storage/v1/object/public/images/${path}`);
}
