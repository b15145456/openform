import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import yaml from 'js-yaml';
import { pool } from './db.js';
import { validateDefinition } from '../../shared/runtime.js';
import { createAuth } from './auth/auth.js';
import { grantPublicAppAccess } from './authz/fga.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS apps (
  id TEXT PRIMARY KEY,
  spec JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  definition_version INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS records_app_id_idx ON records (app_id);

-- Better Auth core schema (users, sessions, credential accounts, verification tokens).
-- Generated via the Better Auth CLI (auth generate --config src/auth/auth.js), made idempotent.
CREATE TABLE IF NOT EXISTS "user" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL,
  "image" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "role" TEXT,
  "banned" BOOLEAN,
  "banReason" TEXT,
  "banExpires" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "impersonatedBy" TEXT
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");

-- Audit log for edit-related operations (app/record create, update, delete).
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  app_id TEXT,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC);
`;

async function seedTemplate(file) {
  const raw = readFileSync(path.join(__dirname, '../../templates', file), 'utf8');
  const def = yaml.load(raw);
  const errs = validateDefinition(def);
  if (errs.length) throw new Error(`${file} invalid: ${errs.join('; ')}`);
  await pool.query(
    `INSERT INTO apps (id, spec, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (id) DO UPDATE SET spec = EXCLUDED.spec, updated_at = now()`,
    [def.app.id, def]
  );
  // First-party starter templates are usable by every colleague by default,
  // not gated behind per-app sharing like a user-created app would be. This
  // is best-effort: OpenFGA is a separate service that can be temporarily
  // unreachable (e.g. still cold-starting) independently of this backend, and
  // that must not take down the whole backend boot — worst case the template
  // just isn't publicly shared until a later restart succeeds.
  try {
    await grantPublicAppAccess(def.app.id, 'editor');
  } catch (e) {
    console.warn(`could not grant public access to ${def.app.id} (will retry on next restart): ${e.message}`);
  }
}

async function bootstrapAdmin() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM "user"');
  if (rows[0].c > 0) return;
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn(
      'No users exist yet, and INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD are not set — cannot create the first admin. Set both env vars and restart the server.'
    );
    return;
  }
  // Constructed only now, after the schema above already exists — Better Auth
  // validates the schema when the instance is built, so building it earlier
  // (e.g. at module load time, before migrations run) fails on a fresh database.
  const auth = createAuth();
  await auth.api.createUser({ body: { email, password, name: email.split('@')[0], role: 'admin' } });
  console.log(`bootstrapped initial admin: ${email}`);
}

export async function migrate() {
  await pool.query(SCHEMA);
  await seedTemplate('mattress.yaml');
  await seedTemplate('workout.yaml');
  await seedTemplate('inspection.yaml');
  await bootstrapAdmin();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => {
      console.log('migration complete');
      return pool.end();
    })
    .catch((e) => {
      console.error('migration failed', e);
      process.exit(1);
    });
}
