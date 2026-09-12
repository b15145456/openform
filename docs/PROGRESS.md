# OpenForm Progress

## 2026-09-12 — Frontend/backend split + database
- Repo restructured into npm workspaces: `frontend/` (Vite static app), `backend/` (Express API), `shared/` (definition/record logic used by both).
- Added Postgres persistence (`apps`, `records` tables) with automatic idempotent migration/seed on backend boot; localStorage-only persistence retired.
- Added REST API and rewired the frontend to call it (`frontend/api.js`, `VITE_API_URL`).
- Verified locally end-to-end against a real (throwaway Docker) Postgres instance: shared runtime tests (7), backend integration tests (4: health, seeded template, record CRUD lifecycle, invalid-definition rejection), a production frontend build, and live curl/API checks including CORS.
- CI now runs backend tests against a Postgres service container in addition to the existing shared tests and frontend build; the pre-existing k8s/Argo CD image-promotion path is unchanged (frontend-only).
- Added a free-tier deployment path (`render.yaml`, documented in `docs/deployment.md` Path A) for Render (frontend static site + backend web service) + Neon (Postgres) — configuration is ready but not yet deployed; that requires the user's own Neon/Render accounts.
- Closed known `js-yaml`/`qs` advisories; `npm audit` now reports 0 vulnerabilities.

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
