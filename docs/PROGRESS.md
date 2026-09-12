# OpenForm Progress

## 2026-09-12 — Input UX pass, upload diagnostics, read-only view
- Diagnosed and fixed a real upload failure on the live deployment: missing object-storage credentials produced an opaque 500; the upload route now checks upfront and returns a clear 503.
- Three input-experience improvements driven by actual usage: live (not submit-time) range hints for number/duration fields, `rating` as clickable number buttons instead of a raw input, and `autocomplete` suggestions on text fields sourced from the app's own existing records.
- Added a read-only record view, separate from the edit form.

## 2026-09-12 — Live on Render, media uploads, LLM-ready spec docs
- OpenForm is live and usable: `openform-frontend`/`openform-backend` on Render, Neon Postgres for data, Neon Object Storage for media — all verified with real traffic, not just local tests.
- Fixed three real bugs a mobile smoke test caught (invisible card text, prompt()-based import, missing Workout/Inspection seeding).
- `docs/openform-definition.md` and `docs/record-language.md` now match the actually-enforced schema (they previously described a different, never-built format) and include a ready-to-paste prompt for generating a Definition with an external LLM for any use case.
- Added a "查看 Spec" view so any app's Definition YAML can be copied/downloaded directly from the UI — closing the loop on "LLM reads a spec, produces a Definition, pastes it in."
- `image`/`video`/`audio` fields now upload for real via presigned URLs to Neon Object Storage; Mattress (photo) and Workout (exercise form video) templates updated to use them, bumping both to `app.version: 2` with existing records confirmed unaffected.
- Two rounds of visual design work: color system, hover/focus states, dark mode, per-app icons, empty states, header branding.

## 2026-09-12 — Real Neon Postgres provisioned
- Linked this repo to an actual Neon project (`aged-moon-84749721`, branch `production`) via the Neon CLI, replacing the "will need Neon/Render accounts" placeholder from earlier the same day.
- Ran the real migration against it (tables created, mattress template seeded) and booted the backend against it, confirmed via `/healthz` and `/api/apps`.
- Installed Neon's agent skills and MCP server for this machine/repo (`.claude/skills/`, global MCP config).
- Remaining gap for a public URL is Render account setup only — the database side is done.

## 2026-09-12 — Frontend/backend split + database
- Repo restructured into npm workspaces: `frontend/` (Vite static app), `backend/` (Express API), `shared/` (definition/record logic used by both).
- Added Postgres persistence (`apps`, `records` tables) with automatic idempotent migration/seed on backend boot; localStorage-only persistence retired.
- Added REST API and rewired the frontend to call it (`frontend/api.js`, `VITE_API_URL`).
- Verified locally end-to-end against a real (throwaway Docker) Postgres instance: shared runtime tests (7), backend integration tests (4: health, seeded template, record CRUD lifecycle, invalid-definition rejection), a production frontend build, and live curl/API checks including CORS.
- CI now runs backend tests against a Postgres service container in addition to the existing shared tests and frontend build; the pre-existing k8s/Argo CD image-promotion path is unchanged (frontend-only).
- Added a free-tier deployment path (`render.yaml`, documented in `docs/deployment.md` Path A) for Render (frontend static site + backend web service) + Neon (Postgres) — configuration is ready but not yet deployed; that requires the user's own Neon/Render accounts.
- Closed known `js-yaml`/`qs` advisories; `npm audit` now reports 0 vulnerabilities.

## 2026-09-12 — Canonical spec hardening
- Recursive collection editor passed GitHub Actions CI #14 and was promoted to an immutable GHCR SHA in the GitOps manifest.
- Added Draft 2020-12 canonical JSON Schema documents for Definition v1 and Record v1.
- Runtime now validates registered semantic types, permits `custom.*`, and rejects non-canonical units.

## 2026-09-12 — Product hardening started
- Runtime recovery CI run #11 succeeded for commit c3861f5.
- GitHub Actions successfully built/pushed GHCR image and automatically promoted the immutable SHA into the Kubernetes Deployment manifest; promotion commits are now visible on main.
- Added canonical first-party Mattress, Workout, and Inspection Definition templates.
- Workout template is the reference nested-collection interoperability example.
- Added initial Semantic Registry source and documentation.

## 2026-09-12 — Runtime recovery
- 恢復 browser runtime entrypoint 與 package/build/test 基礎。
- 建立 Mattress MVP CRUD、local persistence、JSON/CSV export、Definition import/validation。
- 套用 BotHangar 文件慣例並建立 USER_GUIDE/TODO/PROGRESS/CLAUDE context。
- 下一個驗收門檻：公開 URL mobile smoke test。
