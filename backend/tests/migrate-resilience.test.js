import test from 'node:test';
import assert from 'node:assert/strict';

// Regression test for a real production incident: migrate() used to crash
// the whole backend process if OpenFGA was unreachable while seeding the
// starter templates (grantPublicAppAccess call), even though nothing else in
// migrate() actually depends on OpenFGA. Point at a port nothing listens on
// (a plain TCP connect to it fails instantly, no server needed) to prove
// migrate() now degrades gracefully instead of throwing.
process.env.FGA_API_URL = 'http://localhost:1';
process.env.INITIAL_ADMIN_EMAIL = '';
process.env.INITIAL_ADMIN_PASSWORD = '';

const { migrate } = await import('../src/migrate.js');
const { pool } = await import('../src/db.js');

test('migrate() seeds templates into Postgres even when OpenFGA is unreachable', async () => {
  await assert.doesNotReject(() => migrate());
  const { rows } = await pool.query("SELECT id FROM apps WHERE id IN ('mattress_quote', 'workout', 'inspection')");
  assert.equal(rows.length, 3, 'all three starter templates should still be seeded into Postgres');
});

test.after(async () => {
  await pool.end();
});
