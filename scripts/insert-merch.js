/**
 * Одноразовая вставка мерча в Supabase (через REST API, без зависимостей).
 * Запуск: node scripts/insert-merch.js
 */
const SUPABASE_URL = 'https://rvswpgsxutfcpgvmzonr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c3dwZ3N4dXRmY3Bndm16b25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODQ1MTEsImV4cCI6MjA4ODY2MDUxMX0.I_XagunD2zgTVmpaOrt4SvbJbJFHAJAd2j7JpYb26oY';

const row = {
  title: 'Микродроп НПО Мелодия 🎵',
  desc: 'Готовим в Принтмафии микродропыч для НПО Мелодия 🎵\n\nФутболки — Марина Бибик, принты — Лофер',
  poster: 'https://rvswpgsxutfcpgvmzonr.supabase.co/storage/v1/object/public/images/microdropych/photo_2026-03-14%2023.42.47.jpeg',
};

async function main() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/merch`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Ошибка:', res.status, text);
    process.exit(1);
  }

  const data = await res.json();
  console.log('Добавлено:', data);
}

main();
