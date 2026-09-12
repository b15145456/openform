# Changelog

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
