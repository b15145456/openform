import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { migrate } from '../src/migrate.js';
import { createAuth } from '../src/auth/auth.js';
import { pool } from '../src/db.js';

let app;
let auth;
let adminToken;

async function login(email, password) {
  const res = await request(app).post('/api/auth/sign-in/email').send({ email, password });
  assert.equal(res.status, 200, `login failed for ${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

test.before(async () => {
  await migrate();
  auth = createAuth();
  app = createApp(auth);
  adminToken = await login(process.env.INITIAL_ADMIN_EMAIL, process.env.INITIAL_ADMIN_PASSWORD);
});

test.after(async () => {
  await pool.end();
});

const authed = (token) => (method, url) => request(app)[method](url).set('Authorization', `Bearer ${token}`);

test('GET /healthz needs no auth', async () => {
  const res = await request(app).get('/healthz');
  assert.equal(res.status, 200);
});

test('GET /api/apps without a token is rejected', async () => {
  const res = await request(app).get('/api/apps');
  assert.equal(res.status, 401);
});

test('admin sees the seeded mattress template', async () => {
  const res = await authed(adminToken)('get', '/api/apps');
  assert.equal(res.status, 200);
  assert.ok(res.body.some((a) => a.app.id === 'mattress_quote'));
});

test('a regular colleague can see public starter templates via the wildcard grant', async () => {
  const created = await authed(adminToken)('post', '/api/auth/admin/create-user').send({
    email: 'colleague-a@test.local',
    password: 'ColleaguePass123!',
    name: 'Colleague A',
    role: 'user',
  });
  assert.equal(created.status, 200);
  const token = await login('colleague-a@test.local', 'ColleaguePass123!');
  const res = await authed(token)('get', '/api/apps');
  assert.equal(res.status, 200);
  assert.ok(res.body.some((a) => a.app.id === 'mattress_quote'));
});

test('record CRUD lifecycle (as admin)', async () => {
  const create = await authed(adminToken)('post', '/api/apps/mattress_quote/records').send({
    data: { brand: 'Test Brand', price: 100 },
  });
  assert.equal(create.status, 201);
  const id = create.body.id;

  const list = await authed(adminToken)('get', '/api/apps/mattress_quote/records');
  assert.ok(list.body.some((r) => r.id === id));

  const update = await authed(adminToken)('put', `/api/apps/mattress_quote/records/${id}`).send({
    data: { brand: 'Updated Brand', price: 200 },
  });
  assert.equal(update.status, 200);
  assert.equal(update.body.data.brand, 'Updated Brand');

  const del = await authed(adminToken)('delete', `/api/apps/mattress_quote/records/${id}`);
  assert.equal(del.status, 204);
});

test('POST /api/uploads rejects a disallowed content type', async () => {
  const res = await authed(adminToken)('post', '/api/uploads').send({ filename: 'evil.exe', contentType: 'application/x-msdownload' });
  assert.equal(res.status, 400);
});

test('POST /api/apps rejects invalid definition', async () => {
  const res = await authed(adminToken)('post', '/api/apps').send({
    spec: 'openform/definition/v1',
    app: { id: 'bad_field_app', name: 'x', version: 1 },
    fields: [{ id: 'Bad-Field', label: 'x', type: 'text' }],
  });
  assert.equal(res.status, 400);
});

test('DELETE /api/apps/:id removes the app and cascades its records', async () => {
  const def = {
    spec: 'openform/definition/v1',
    app: { id: 'deletable_app', name: 'Deletable', version: 1 },
    fields: [{ id: 'x', label: 'X', type: 'text' }],
  };
  await authed(adminToken)('post', '/api/apps').send(def);
  await authed(adminToken)('post', '/api/apps/deletable_app/records').send({ data: { x: 'hi' } });

  const del = await authed(adminToken)('delete', '/api/apps/deletable_app');
  assert.equal(del.status, 204);

  const getApp = await authed(adminToken)('get', '/api/apps/deletable_app');
  assert.equal(getApp.status, 404);
  const records = await authed(adminToken)('get', '/api/apps/deletable_app/records');
  assert.deepEqual(records.body, []);

  const again = await authed(adminToken)('delete', '/api/apps/deletable_app');
  assert.equal(again.status, 404);
});

test('per-app sharing: owner-only app is invisible to an unrelated colleague, then works after sharing', async () => {
  await authed(adminToken)('post', '/api/auth/admin/create-user').send({
    email: 'owner-b@test.local',
    password: 'OwnerPass123!',
    name: 'Owner B',
    role: 'user',
  });
  await authed(adminToken)('post', '/api/auth/admin/create-user').send({
    email: 'outsider-b@test.local',
    password: 'OutsiderPass123!',
    name: 'Outsider B',
    role: 'user',
  });
  const ownerToken = await login('owner-b@test.local', 'OwnerPass123!');
  const outsiderToken = await login('outsider-b@test.local', 'OutsiderPass123!');

  const created = await authed(ownerToken)('post', '/api/apps').send({
    spec: 'openform/definition/v1',
    app: { id: 'owner_b_private_app', name: 'Private', version: 1 },
    fields: [{ id: 'x', label: 'X', type: 'text' }],
  });
  assert.equal(created.status, 201);

  const beforeShare = await authed(outsiderToken)('get', '/api/apps/owner_b_private_app');
  assert.equal(beforeShare.status, 403);
  const listBefore = await authed(outsiderToken)('get', '/api/apps');
  assert.ok(!listBefore.body.some((a) => a.app.id === 'owner_b_private_app'));

  const denyWrite = await authed(outsiderToken)('post', '/api/apps/owner_b_private_app/access').send({
    email: 'outsider-b@test.local',
    relation: 'viewer',
  });
  assert.equal(denyWrite.status, 403, 'a non-owner must not be able to grant access to themselves');

  const share = await authed(ownerToken)('post', '/api/apps/owner_b_private_app/access').send({
    email: 'outsider-b@test.local',
    relation: 'viewer',
  });
  assert.equal(share.status, 201);

  const afterShare = await authed(outsiderToken)('get', '/api/apps/owner_b_private_app');
  assert.equal(afterShare.status, 200);
  const writeAsViewer = await authed(outsiderToken)('post', '/api/apps/owner_b_private_app/records').send({ data: { x: 'nope' } });
  assert.equal(writeAsViewer.status, 403, 'a viewer must not be able to create records');
  const deleteAsViewer = await authed(outsiderToken)('delete', '/api/apps/owner_b_private_app');
  assert.equal(deleteAsViewer.status, 403, 'a viewer must not be able to delete the app');
});

test('a global "viewer" account can never edit, even on an app shared to them as editor', async () => {
  await authed(adminToken)('post', '/api/auth/admin/create-user').send({
    email: 'viewer-c@test.local',
    password: 'ViewerPass123!',
    name: 'Viewer C',
    role: 'viewer',
  });
  const ownerToken = await login('owner-b@test.local', 'OwnerPass123!');
  const viewerToken = await login('viewer-c@test.local', 'ViewerPass123!');

  // Share as *editor* — the global viewer role must still cap them down to read-only.
  const share = await authed(ownerToken)('post', '/api/apps/owner_b_private_app/access').send({
    email: 'viewer-c@test.local',
    relation: 'editor',
  });
  assert.equal(share.status, 201);

  const canRead = await authed(viewerToken)('get', '/api/apps/owner_b_private_app');
  assert.equal(canRead.status, 200);
  const cannotWrite = await authed(viewerToken)('post', '/api/apps/owner_b_private_app/records').send({ data: { x: 'nope' } });
  assert.equal(cannotWrite.status, 403);
  const cannotCreateApp = await authed(viewerToken)('post', '/api/apps').send({
    spec: 'openform/definition/v1',
    app: { id: 'viewer_should_not_create', name: 'x', version: 1 },
    fields: [{ id: 'x', label: 'X', type: 'text' }],
  });
  assert.equal(cannotCreateApp.status, 403);
});

test('audit log records app/record mutations and is admin-only', async () => {
  const nonAdminToken = await login('colleague-a@test.local', 'ColleaguePass123!');
  const denied = await authed(nonAdminToken)('get', '/api/audit-log');
  assert.equal(denied.status, 403);

  const res = await authed(adminToken)('get', '/api/audit-log');
  assert.equal(res.status, 200);
  assert.ok(res.body.some((e) => e.action === 'app.create' && e.entity_id === 'owner_b_private_app'));
  assert.ok(res.body.some((e) => e.action === 'app.share' && e.entity_id === 'owner_b_private_app'));
});
