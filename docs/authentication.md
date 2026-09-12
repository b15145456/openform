# Authentication & Authorization

## Current status

Implemented. Two separate open-source systems handle two separate concerns — do not conflate them:

- **Authentication** ("who is this?") — [Better Auth](https://better-auth.com) v1.7.4, self-hosted, backed by the same Postgres as the rest of the app.
- **Authorization** ("what can they do?") — [OpenFGA](https://openfga.dev), a Zanzibar-style relationship-based access control (ReBAC) engine, run as its own service with its own datastore.

They coexist because they solve different problems: a user can be authenticated (logged in) and still have no relationship to a given app.

## Authentication — Better Auth

- `backend/src/auth/auth.js` exports a `createAuth()` factory (not a singleton) using the `admin` and `bearer` plugins. It's a factory rather than a module-level instance because Better Auth validates its Postgres schema at construction time; constructing it before `migrate()` has run against a fresh database throws. `backend/src/server.js` calls `migrate()`, then `createAuth()`, then boots the app.
- Sessions are delivered as **bearer tokens**, not cookies. Frontend and backend are deployed as separate `onrender.com` subdomains, and `onrender.com` is a public suffix — cross-subdomain cookies don't work reliably there. The frontend (`frontend/auth-client.js`) stores the token in `localStorage` and attaches it via `fetchOptions.auth.type: 'Bearer'`.
- `backend/src/auth/middleware.js`'s `authenticate` middleware calls `auth.api.getSession()` on every request to `/api/*` (mounted in `backend/src/app.js`) and populates `req.user = { id, email, role }`.
- Three global roles, stored on the Better Auth user record via the `admin` plugin: `admin`, `user`, `viewer`. `viewer` is a hard cap — `requireAppAccess()` rejects any non-read request from a `viewer` account before even consulting OpenFGA, regardless of what that user is individually shared as on a given app.
- The first admin account is bootstrapped once, on first boot, from `INITIAL_ADMIN_EMAIL`/`INITIAL_ADMIN_PASSWORD` (`backend/src/migrate.js`'s `bootstrapAdmin()`) — only runs when the `user` table is empty. From then on, `admin` accounts create every other account (`authClient.admin.createUser`), and any account can change its own password (`renderChangePassword()` in `frontend/app.js`, calling `authClient.changePassword`).
- CORS must be configured with `credentials: true` even though bearer auth is used, because Better Auth's client sends `credentials: 'include'` by default (`backend/src/app.js`).

## Authorization — OpenFGA

- `backend/src/authz/fga.js` defines one `app` type with `owner`/`editor`/`viewer` relations, related by union + `computedUserset` so `owner ⊇ editor ⊇ viewer` (an owner automatically passes an editor or viewer check). `editor`/`viewer` also accept the `user:*` wildcard, used only to grant first-party starter templates (mattress/workout/inspection) to every authenticated user by default.
- `ensureFga()` is idempotent: finds-or-creates the `openform` store and finds-or-writes the authorization model on first use.
- `backend/src/routes/apps.js` and `backend/src/routes/records.js` gate every route through `requireAppAccess(relation)` (`viewer` to read, `editor` to write, `owner` to delete or manage sharing).
- `backend/src/routes/access.js` (`/api/apps/:id/access`) is the sharing API: list current grants (owner-only), grant a relation to a user by email, revoke a user's access.
- OpenFGA is configured with a **Postgres-backed datastore** (`OPENFGA_DATASTORE_ENGINE=postgres`, same connection string as the app), not its default in-memory datastore — Render's free tier spins the service down on idle, and an in-memory datastore would silently wipe every sharing grant on each restart.
- The OpenFGA HTTP API itself is protected with a preshared key (`OPENFGA_AUTHN_METHOD=preshared` / `OPENFGA_AUTHN_PRESHARED_KEYS`) in any deployed environment, since it's reachable at a public URL and would otherwise let anyone write permission tuples directly (e.g. grant themselves ownership of any app).

## Audit log

- `audit_log` table (`backend/src/migrate.js`), written by `backend/src/audit.js`'s `recordAudit()` on every app/record create, update, delete, and share action — actor id/email, action, entity type/id, app id, a JSON detail payload, and a timestamp.
- `GET /api/audit-log` (`backend/src/routes/auditLog.js`) is `admin`-only, paginated by cursor (`?limit`/`?before`).

## Credentials and secrets

- `BETTER_AUTH_SECRET` — generate with `openssl rand -base64 32`. Required in every real deployment.
- `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` — used exactly once, on first boot against an empty user table; rotate the password afterward via the change-password screen.
- `FGA_API_KEY` — the OpenFGA preshared key; required whenever `FGA_API_URL` points at a deployed (non-localhost) OpenFGA instance.
- None of these are committed; see `backend/.env.example` for the full list and `docs/deployment.md` for where each is set in production.

## Verification

Verified locally against real infrastructure (a real Postgres container plus a real OpenFGA container, not mocks): `backend/tests/api.test.js` (11 tests, `npm test --workspace backend`) covers unauthenticated rejection, role-based visibility, the full per-app sharing lifecycle (create → outsider gets 403 → share → outsider can view but not write or delete), the global-viewer-role-overrides-per-app-editor-grant case, and audit log content/access control. A Playwright pass through the same scenarios in an actual browser (admin creates accounts, a colleague builds and shares an app, a viewer-tier account is correctly capped, an unrelated account sees nothing) produced zero console errors. Not yet exercised against the production Neon database or a deployed OpenFGA instance — see `docs/deployment.md` and `docs/TODO.md`.
