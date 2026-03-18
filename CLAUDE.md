# Claude Code project context: npo.melodiya

## What this repo is
- Vite-based frontend (public site + admin panel) written in plain JavaScript.
- Two entry points:
  - Public site: `index.html` -> `src/main.js` -> `src/script.js`
  - Admin panel: `admin.html` -> `src/admin/main.js` -> `src/admin/admin.js`
- Data/auth layer: `src/db.js` (Supabase client wrapper). `window.dbLayer` is the main integration surface for both public and admin UIs.

## Key files
- `index.html` / `admin.html`: HTML pages at project root.
- `src/main.js`: public entry; imports `src/db.js` and `src/script.js`.
- `src/script.js`: public UI logic and rendering.
- `src/admin/main.js`: admin entry; imports `src/db.js` and `src/admin/admin.js`.
- `src/admin/admin.js`: admin UI logic (auth check + CRUD-ish pages for events/artists/etc).
- `src/db.js`: Supabase integration and helper methods.

## Supabase notes
- Supabase connection values are currently hardcoded in `src/db.js`.
- If asked to “fix auth / permissions / CRUD”, prefer changing logic in `src/db.js` or `src/admin/admin.js`.
- Avoid changing Supabase URL/anon key unless the user explicitly requests it (those are credentials/secrets).

## Conventions (so edits stay consistent)
- Keep file extensions and import style as-is (ES modules, `.js` imports).
- Use existing data-field naming patterns when mapping to/from Supabase:
  - Some fields are snake_case in the DB payloads (e.g. `ticket_url` in admin).
  - The UI may access camelCase variants as well; preserve the current compatibility approach.

## How to run locally
- Install deps: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`

## Safe edit scope
Claude should generally edit:
- `src/**` and project root `*.html` / `*.css` / `*.mjs`

Prefer not to edit:
- static binary/font assets (e.g. `.ttf`) unless explicitly requested.

## Workflow preference
- First: explain what you plan to change and where.
- Then: make a minimal set of edits.
- Always ask for approval before modifying files (Claude Code default behavior).
