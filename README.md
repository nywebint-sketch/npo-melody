## НПО Мелодия — фронтенд + админка

Статический фронтенд с **Supabase** (БД, Auth, Storage) и отдельной админ-панелью. Сборка и локальный запуск через **Vite**; деплой — GitHub Pages или любой статический хостинг.

**Репозиторий:** [github.com/deliacorona-web/npo.melody](https://github.com/deliacorona-web/npo.melody)

Чтобы пушить в **другой** репозиторий на GitHub:

```bash
git remote set-url origin https://github.com/<логин>/<имя-репо>.git
git push -u origin main
```

### Структура

- `index.html` — публичный сайт (афиша, артисты, релизы, подкасты, **Live**, мерч, профиль, контакты)
- `admin.html` — админ-панель (события, артисты, стримы, мерч, пользователи и т.д.)
- `src/`
  - `main.js` — entry для публичного сайта
  - `admin/main.js` — entry для админки
  - `db.js` — слой данных Supabase (`events`, `artists`, `releases`, `podcasts`, `streams`, `merch`, профили, auth, загрузка изображений)
  - `script.js` — UI и логика публичного сайта
  - `admin/admin.js` — логика админки
- `styles.css`, `admin.css` — стили
- `vite.config.mjs` — Vite (multi-entry: `index.html` и `admin.html`)
- `scripts/` — вспомогательные скрипты (например SQL для данных)

### Раздел Live

- **Live** и **архив трансляций** на публичном сайте показываются только **после входа** (Supabase Auth: вход / регистрация в профиле).
- Без сессии пользователь видит пояснение и может открыть модалку входа.
- Для защиты данных на уровне БД настройте **RLS** в Supabase для таблицы `streams` (клиентская проверка не заменяет политики на сервере).

### Как запустить локально

1. **Клонировать репозиторий**

   ```bash
   git clone https://github.com/deliacorona-web/npo.melody.git
   cd npo.melody
   ```

   Либо скачать ZIP с GitHub и перейти в папку проекта.

2. **Установить зависимости**

   ```bash
   npm install
   ```

3. **Запустить dev-сервер**

   ```bash
   npm run dev
   ```

4. **Открыть в браузере**

   - Сайт: `http://localhost:5173/`
   - Админка: `http://localhost:5173/admin.html`

   Если порт занят, Vite может выбрать другой (например `5174`) — смотрите вывод в терминале.

### Продакшен-сборка

```bash
npm run build
```

Артефакты в каталоге `dist/`. В `vite.config.mjs` задан `base: './'`, сборка подходит для GitHub Pages и подкаталогов.

### GitHub Pages

1. `npm run build`
2. Выложить содержимое `dist/` (ветка `gh-pages`, Actions или `git subtree push` — см. историю коммитов / настройки репозитория).
3. В **Settings → Pages**: источник — ветка `gh-pages`, папка `/ (root)`.

Типичный URL: `https://deliacorona-web.github.io/npo.melody/`  
Админка: `https://deliacorona-web.github.io/npo.melody/admin.html`

Подробнее про кастомный домен и DNS — см. ниже (раздел «Нормальный адрес»).

### Supabase

URL и anon-ключ проекта заданы в `src/db.js` (глобальный `window.supabase` подключается из `index.html` / `admin.html`).

Дальше можно вынести значения в переменные окружения (`VITE_SUPABASE_*`) и подставлять при сборке в CI.

### Сущности в БД

| Таблица / область | Назначение |
|-------------------|------------|
| `events` | Афиша (админка: CRUD, постеры в Storage) |
| `artists` | Артисты (CRUD, фото, букинг) |
| `releases` | Релизы |
| `podcasts` | Подкасты |
| `streams` | Трансляции / архив |
| `merch` | Мерч |
| `profiles` | Профили пользователей, роли (`admin` и др.) |

Публичный сайт и админка используют `window.dbLayer` из `src/db.js`.

### Нормальный адрес (кастомный домен)

Чтобы сайт открывался по своему домену вместо `*.github.io`:

1. Купить домен у регистратора.
2. Настроить DNS для GitHub Pages (записи **A** на IP GitHub и/или **CNAME** на `USERNAME.github.io` — см. [документацию GitHub Pages](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)).
3. В репозитории: **Settings → Pages → Custom domain**, при необходимости включить **Enforce HTTPS** после распространения DNS.

### Если браузер показывает «Опасный сайт»

Предупреждение идёт от **Google Safe Browsing**, не от кода сайта. Запрос пересмотра: [safebrowsing.google.com/safebrowsing/report_error/](https://safebrowsing.google.com/safebrowsing/report_error/).

Если в предупреждении фигурирует домен Supabase (`*.supabase.co`), разбирать нужно именно тот URL.
