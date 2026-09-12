import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import yaml from 'js-yaml';
import { pool } from './db.js';
import { validateDefinition } from '../../shared/runtime.js';

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
`;

async function seedTemplate(file) {
  const raw = readFileSync(path.join(__dirname, '../../templates', file), 'utf8');
  const def = yaml.load(raw);
  const errs = validateDefinition(def);
  if (errs.length) throw new Error(`${file} invalid: ${errs.join('; ')}`);
  await pool.query(
    `INSERT INTO apps (id, spec) VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [def.app.id, def]
  );
}

export async function migrate() {
  await pool.query(SCHEMA);
  await seedTemplate('mattress.yaml');
  await seedTemplate('workout.yaml');
  await seedTemplate('inspection.yaml');
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
