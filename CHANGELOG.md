# Changelog

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
