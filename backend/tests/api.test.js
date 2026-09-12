import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { migrate } from '../src/migrate.js';
import { pool } from '../src/db.js';

test.before(async () => {
  await migrate();
});

test.after(async () => {
  await pool.end();
});

const app = createApp();

test('GET /healthz', async () => {
  const res = await request(app).get('/healthz');
  assert.equal(res.status, 200);
});

test('GET /api/apps includes seeded mattress template', async () => {
  const res = await request(app).get('/api/apps');
  assert.equal(res.status, 200);
  assert.ok(res.body.some((a) => a.app.id === 'mattress_quote'));
});

test('record CRUD lifecycle', async () => {
  const create = await request(app)
    .post('/api/apps/mattress_quote/records')
    .send({ data: { brand: 'Test Brand', price: 100 } });
  assert.equal(create.status, 201);
  const id = create.body.id;

  const list = await request(app).get('/api/apps/mattress_quote/records');
  assert.ok(list.body.some((r) => r.id === id));

  const update = await request(app)
    .put(`/api/apps/mattress_quote/records/${id}`)
    .send({ data: { brand: 'Updated Brand', price: 200 } });
  assert.equal(update.status, 200);
  assert.equal(update.body.data.brand, 'Updated Brand');

  const del = await request(app).delete(`/api/apps/mattress_quote/records/${id}`);
  assert.equal(del.status, 204);
});

test('POST /api/uploads rejects a disallowed content type', async () => {
  const res = await request(app)
    .post('/api/uploads')
    .send({ filename: 'evil.exe', contentType: 'application/x-msdownload' });
  assert.equal(res.status, 400);
});

test('POST /api/apps rejects invalid definition', async () => {
  const res = await request(app)
    .post('/api/apps')
    .send({
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
  await request(app).post('/api/apps').send(def);
  await request(app).post('/api/apps/deletable_app/records').send({ data: { x: 'hi' } });

  const del = await request(app).delete('/api/apps/deletable_app');
  assert.equal(del.status, 204);

  const getApp = await request(app).get('/api/apps/deletable_app');
  assert.equal(getApp.status, 404);
  const records = await request(app).get('/api/apps/deletable_app/records');
  assert.deepEqual(records.body, []);

  const again = await request(app).delete('/api/apps/deletable_app');
  assert.equal(again.status, 404);
});
