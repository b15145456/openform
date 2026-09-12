# Production deployment

OpenForm now ships two independent deployment paths. Pick the one that matches where you're actually running the app — they don't depend on each other.

## Path A — Free hosting (Render + Neon)

This is the path to use when there is no self-hosted Kubernetes cluster. It deploys the `frontend/` static site and `backend/` API as two separate free-tier Render services, backed by a free Neon Postgres database.

### Database — done
A real Neon project is already provisioned and linked to this repo:
- Project `aged-moon-84749721`, branch `production` (org `org-calm-hall-14765228`).
- Linked via the [Neon CLI](https://github.com/neondatabase/neon-pkgs) (`neon link --project-id aged-moon-84749721 --branch production -y`), which wrote `.neon` (gitignored — local project pointer) and pulled `DATABASE_URL` into `.env.local` (gitignored — never committed).
- `neon.ts` at the repo root declares the policy (currently just `defineConfig({})`, i.e. defaults); `neon deploy` (alias for `neon config apply`) reconciles it against the `production` branch.
- Verified for real: ran `npm run backend:migrate` against this database (created `apps`/`records` tables, seeded the mattress template) and booted `backend/src/server.js` against it, then curled `/healthz` and `/api/apps` successfully.
- To get the connection string again on another machine: `neon connection-string production --project-id aged-moon-84749721`, or just `neon link` + `neon env pull` in this directory (already linked, so a plain `neon env pull` is enough).

### One-time setup (Render)
1. Create a free account at Render (https://render.com) and connect the `b15145456/openform` GitHub repo.
2. Render reads `render.yaml` at the repo root and creates two services:
   - `openform-backend` — Node web service running `npm start` (runs DB migration/seed automatically on boot, then serves the API).
   - `openform-frontend` — static site built with `npm run build`, published from `frontend/dist`.
3. In the Render dashboard, set environment variables (these are marked `sync: false` in `render.yaml`, so Render won't auto-fill them):
   - On `openform-backend`: `DATABASE_URL` (from `.env.local` above, or `neon connection-string production --project-id aged-moon-84749721`), `FRONTEND_ORIGIN` (the `openform-frontend` public URL, e.g. `https://openform-frontend.onrender.com`) — restricts CORS to that origin — plus `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION` (all four from `.env.local`, pulled by `neon deploy`/`neon env pull` after `neon.ts` declared the `media` bucket) so `image`/`video`/`audio` field uploads work.
   - On `openform-frontend`: `VITE_API_URL` (the `openform-backend` public URL) — baked into the static build at build time, so redeploy the frontend after changing it.

### Notes
- The backend free instance spins down after inactivity; the first request after idling takes ~30-60s to wake up.
- Migrations run automatically and idempotently at backend boot (`backend/src/migrate.js`) — no manual migration step needed.
- Live and verified with real traffic: https://openform-frontend.onrender.com / https://openform-backend.onrender.com.

### Auth/RBAC/OpenFGA setup (required — added after the initial deployment above)
Adds a third Render service (`openform-fga`, an OpenFGA container) plus new env vars on `openform-backend`. See `docs/authentication.md` for what each piece does.

1. **Generate two secrets** (once, keep them somewhere durable — a password manager, not just this terminal):
   - `openssl rand -base64 32` → `BETTER_AUTH_SECRET`.
   - `openssl rand -base64 32` → a preshared key, used as both `FGA_API_KEY` (on the backend) and `OPENFGA_AUTHN_PRESHARED_KEYS` (on the FGA service) — they must be the same value.
2. **One-time OpenFGA schema migration against the production database** — OpenFGA needs its own tables in the same Postgres database (separate from the `apps`/`records`/Better Auth tables `backend/src/migrate.js` manages):
   ```bash
   docker run --rm openfga/openfga migrate --datastore-engine postgres --datastore-uri '<production Neon DATABASE_URL>'
   ```
   Run this once, before the `openform-fga` service first boots against that database.
3. **Create the `openform-fga` service** by syncing the Render Blueprint (`render.yaml` already declares it) or adding it manually with: image `docker.io/openfga/openfga:latest`, command `run`, health check `/healthz`, plan `free`. Set its env vars: `OPENFGA_DATASTORE_ENGINE=postgres`, `OPENFGA_DATASTORE_URI` (same Neon `DATABASE_URL` as the backend), `OPENFGA_AUTHN_METHOD=preshared`, `OPENFGA_AUTHN_PRESHARED_KEYS` (the preshared key from step 1). Postgres-backed, not the default in-memory datastore — the free tier's spin-down-on-idle would otherwise wipe every sharing grant on restart.
4. **Set new env vars on `openform-backend`**: `BETTER_AUTH_SECRET` (step 1), `BETTER_AUTH_URL` (this service's own public URL, e.g. `https://openform-backend.onrender.com`), `INITIAL_ADMIN_EMAIL`/`INITIAL_ADMIN_PASSWORD` (only used once, when the `user` table is empty — pick a real email and a temporary password, then change it via the app's "變更密碼" screen after first login), `FGA_API_URL` (the `openform-fga` service's public URL from step 3), `FGA_API_KEY` (the preshared key from step 1).
5. Redeploy `openform-backend` so it picks up the new env vars. On boot it seeds the starter templates and — only if the user table is still empty — bootstraps the `INITIAL_ADMIN_EMAIL` account as `admin`.
6. Smoke test against the live URLs: log in as the bootstrapped admin, create a second (colleague) account, share an app with it, confirm the audit log (`docs/authentication.md`) shows the actions.

As of the last update to this doc, steps 1-6 have been verified locally (real Docker Postgres + real Docker OpenFGA, not the production database) but **not yet run against the actual Render/Neon production environment** — see `docs/TODO.md` and `docs/HANDOFF.md` for current status.

## Path B — Self-hosted GitOps (Kubernetes/k3s + Argo CD)

Kept for when a self-hosted cluster becomes available. This path only deploys `frontend/` as a static site behind nginx (see `Dockerfile`); it does not include the backend/database.

OpenForm uses GitOps: GitHub Actions tests/builds, publishes an immutable image to GHCR, then commits that SHA into the Kubernetes desired state. Argo CD observes `main` and performs the cluster deployment. CI never receives cluster credentials.

### One-time operator prerequisites
- A Kubernetes/k3s cluster with Traefik.
- Argo CD installed and reachable by the cluster operator.
- Production DNS hostname pointing at Traefik.
- If the GitHub repository or GHCR package is private, configure Argo CD repository credentials and a Kubernetes GHCR imagePullSecret.

### Bootstrap
Replace `openform.example.com` in `deploy/k8s/ingress.yaml`, commit it, then run `./deploy/bootstrap.sh` from a workstation with the target kubeconfig. Verify with `./deploy/verify.sh`.

After bootstrap, normal releases require only a push to `main`: CI → GHCR → Git manifest promotion → Argo CD reconciliation.
