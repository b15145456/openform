# Changelog

## [0.7.1] - 2026-09-12

### Added
- `DELETE /api/apps/:id` — there was previously no way to delete an App at all, only individual records (records cascade-delete automatically via the existing FK). Added a "刪除 App" button on the app screen with a clear confirmation.
- Importing a Spec whose `app.id` collides with an existing app now warns before overwriting it, instead of silently replacing the existing app's definition.

### Fixed
- `openApp()` fetched the Definition and the record list sequentially (two round trips); they're independent, so now fetched in parallel via `Promise.all`.
- Saving or deleting a record re-fetched the (unchanged) Definition every time via a full `openApp()` call; now only re-fetches the record list (`refreshRecords()`), cutting a redundant network round trip out of the most common action in the app.
- The loading state now explains a likely cause after 4s (Render's free tier cold-start) instead of just sitting on a bare "載入中…".

## [0.7.0] - 2026-09-12

### Changed
- Full visual re-skin: "Stationery Journal" direction, chosen by the user from six mocked-up alternatives (paper form, industrial console, Swiss grid, clinical report, retro receipt, and this one). Fraunces (display serif) + Nunito Sans (body), warm kraft/cream palette with a dusty-plum accent in light mode and a warm dark "leather journal at night" palette in dark mode, pill-shaped buttons, and a rotating plum/sage/ochre color tab on each app card. Implemented entirely through the existing CSS custom-property token system, so no HTML/JS structure changed.

## [0.6.0] - 2026-09-12

### Added
- Split-pane spec editor: left side is an editable Spec (YAML) textarea, right side is the visual field editor, both bound to the same in-memory Definition and kept in sync live in both directions — edit either side, the other updates. The right side still validates through the same `validateDefinition`/`POST /api/apps` path as before.
- A consistent top-left "← 返回" back button on every non-home screen (app screen, record view, spec view, record form, both conversation-mode screens, the conversation review screen, import spec, and the split editor), including the previously dead-end "failed to load app" error state.

### Changed
- Editing an existing app's spec now refuses to save if `app.id` was changed (possible via the raw YAML side of the split editor), since that would silently orphan the original app instead of updating it — shows a clear error instead.

## [0.5.2] - 2026-09-12

### Changed
- Dark mode's teal/mint accent replaced with a neutral slate gray-blue (`#6b7684`) per explicit user preference — no more colored glow anywhere in dark mode; hierarchy comes from spacing/weight, not hue. Light mode's teal is unchanged (no complaint there).

## [0.5.1] - 2026-09-12

### Fixed
- Dark mode (`prefers-color-scheme: dark`) was too bright/neon — accent color toned down, backgrounds softened, the hero heading's gradient-text effect and buttons' glow shadow both disabled in dark mode.
- The visual Definition editor exposed `id`/`semantic_type`/`unit` for every field unconditionally, contradicting this project's own "regular users shouldn't see Schema/Registry" principle. Moved behind a collapsed-by-default `<details>` "進階設定" section; field `id` now auto-fills (`field_1`, `field_2`, ...) if left blank, and both App ID and field ID inputs sanitize live instead of rejecting bad input only at save time. The Version number is no longer a raw editable input — it's auto-managed with an explanatory line.
- CSV export used field `id`s (e.g. `back_support`) as column headers instead of human `label`s (e.g. 仰睡支撐).
- `csvEscape` produced `"[object Object]|[object Object]"` for any `collection` field, since arrays always went through `.join('|')` regardless of content. Only plain-value arrays (e.g. `multi_select`) join now; arrays of objects (collection data) are JSON-stringified instead.
- Removed a dead `<input id="importFile">` left over from before the import flow was rebuilt — never referenced by any code.

## [0.5.0] - 2026-09-12

### Added
- `app.interaction_mode: form | conversation` — an optional, purely presentational Definition property. `conversation` renders one field per screen (with back/next), offers a yes/no "add one more?" loop for `collection` fields, and ends in a read-only review screen with a "完成對話" button that actually saves. Applied to `mattress_quote`.
- A visual, recursive Definition editor ("視覺化建立" on the home screen, "編輯 Spec" on an app screen): add/remove/reorder fields (including nested `collection` subfields), edit type/min/max/semantic_type/unit/options, all validated through the same `validateDefinition` and saved through the same `POST /api/apps` as a hand-written or LLM-generated spec. Reordering uses ▲/▼ buttons rather than a drag gesture — native HTML5 drag-and-drop isn't reliable on mobile touch, and this app is mobile-first.

### Fixed
- A real scoping bug in the new editor: the options-editor event bindings used an unscoped `querySelectorAll`, which could leak into a nested collection subfield's own options editor. Fixed by scoping to `:scope > .options-editor` first.

## [0.4.2] - 2026-09-12

### Changed
- Third visual design pass: a display font (Manrope) for headings/logo, a gradient hero panel with gradient-text heading, an accent left-bar on `h2` section headings, a colored accent stripe that reveals on card hover, glowing shadow on primary buttons, and app-icon badges (rounded tile background instead of a bare emoji).

## [0.4.1] - 2026-09-12

### Added
- Read-only "檢視" (view) button on each record, alongside edit/delete — shows all fields (including nested collections and media previews) without opening the editable form.
- `rating` fields render as a row of selectable number buttons instead of a raw numeric input.
- `number`/`duration` fields with `min`/`max` show a persistent range hint and flag out-of-range values as the user types, instead of only on submit via the browser's native validation popup.
- `text` fields can be marked `autocomplete: true` to suggest previously entered values for that field (pulled from the app's own records, not hardcoded in the Definition) via a `<datalist>`. Applied to Mattress's `store`/`brand`.

### Fixed
- `POST /api/uploads` returned an opaque 500 when the Neon Object Storage credentials weren't configured on the deployment; it now checks upfront and returns a clear 503 with a Chinese explanation instead.

## [0.4.0] - 2026-09-12

### Added
- `image`/`video`/`audio` fields now upload for real: presigned-URL uploads direct to Neon Object Storage (`backend/src/storage.js`, `POST /api/uploads`), stored as a plain public URL string in Record `data` — no special-casing in the Record shape. Mattress template gained a `photo` field, Workout gained `form_video` per exercise; both bumped to `app.version: 2`.
- A "查看 Spec" view on every app screen: dumps its Definition as YAML with copy/download, so a user can hand their own app's spec to an external LLM as a concrete example when asking it to generate a Definition for a different use case.

### Fixed
- `docs/openform-definition.md` / `docs/record-language.md` described a schema that was never implemented (leftover early draft); rewritten to match `openform/definition/v1` / `openform/record/v1` exactly, with a ready-to-paste LLM prompt for generating a Definition for any domain.
- Migration seeding changed from insert-only to upsert, so first-party template updates (like the new photo/video fields) reach already-deployed instances — verified this does not disturb existing records.

### Deployed
- First public deployment: `openform-frontend`/`openform-backend` on Render (free tier), Neon Postgres + Neon Object Storage for data/media. Verified live via curl and a real mobile smoke test, which caught and led to fixing three UI bugs (invisible card text on `button.card`, a native-`prompt()` import flow replaced with an in-page editor, and Workout/Inspection templates that existed as files but were never seeded).

## [0.3.1] - 2026-09-12

### Fixed
- Mobile smoke test on the live Render deployment surfaced real bugs: `.card` had no explicit `color`, so `button.appcard` rendered invisible white-on-white text (background from `.card`, color from the generic `button` rule); "Import Spec" was a single-line native `prompt()` with no room for multi-line YAML/JSON and no preview; only the mattress template was seeded on backend boot, so Workout/Inspection existed as files but never appeared as usable apps. All three fixed.
- Rewrote `docs/openform-definition.md` and `docs/record-language.md`, which described an entirely different, never-implemented schema (`openform: "0.1"`, `key`, `recordType`, `openformRecord`) left over from early drafting. They now document the actual enforced contract (`openform/definition/v1` / `openform/record/v1`, matching `shared/runtime.js` and `spec/*.schema.json` exactly) and include a copy-pasteable prompt for generating a Definition with an external LLM for any use case, not just the built-in templates.

### Changed
- Visual redesign of the frontend (`frontend/style.css`): CSS custom properties for color/spacing tokens, a calmer accent color, hover/focus states on cards and buttons, and automatic dark-mode support via `prefers-color-scheme`. No markup/class-name changes, so `app.js` is untouched.

## [0.3.0-alpha.1] - 2026-09-12

### Added
- Split the project into `frontend/` (Vite static app) and `backend/` (Express API), sharing definition/record logic via `shared/runtime.js`.
- Postgres-backed persistence (`apps`, `records` tables) replacing browser localStorage; automatic idempotent migration/seed on backend boot.
- REST API: `GET/POST /api/apps`, `GET/POST/PUT/DELETE /api/apps/:id/records`.
- npm workspaces (`frontend`, `backend`) at the repo root.
- Backend integration test suite (`backend/tests/api.test.js`) run against a real Postgres in CI (service container) and verified locally against Docker Postgres.
- Free-tier deployment path via `render.yaml` (Render static site + Node web service) documented in `docs/deployment.md`, alongside the existing self-hosted k8s/Argo CD path (frontend-only, unchanged).
- `qs`/`js-yaml` dependency overrides to close known advisories (`npm audit`: 0 vulnerabilities).

### Changed
- CI now also installs workspaces and runs backend tests against a Postgres service container before building.
- `docs/USER_GUIDE.md` updated: data now lives in a shared server database, not per-browser localStorage.

## [0.2.0-alpha.4] - 2026-09-12

### Added
- Automated immutable-image GitOps promotion after successful CI/container publishing.
- GitHub Actions build cache.
- RollingUpdate deployment policy and hardened pod/container security context.
- Kubernetes NetworkPolicy.
- Dependabot for npm, Actions and Docker dependencies.
- One-command Argo CD bootstrap and deployment verification scripts.
- Production deployment runbook.

### Deployment status
- Everything that can be repository-automated is configured.
- Remaining production bootstrap requires the target cluster, Argo CD and DNS/operator credentials.

## [0.2.0-alpha.3] - 2026-09-12
- Added GitHub Actions → Docker → GHCR → Argo CD → Kubernetes/k3s → Traefik GitOps delivery.

## [0.2.0-alpha.2] - 2026-09-12
- Runtime Definition validation, dynamic controls, tests and mobile Mattress workflow.

## [0.1.0-alpha.1] - 2026-09-12
- Initial OpenForm specifications and GitHub source-of-truth governance.
