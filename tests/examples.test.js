import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const fixtures = [
  ['mattress.record.json', 'mattress_quote', 2],
  ['workout.record.json', 'workout', 2],
  ['inspection.record.json', 'inspection', 1]
];

async function load(name) {
  return JSON.parse(await readFile(new URL(`../examples/${name}`, import.meta.url), 'utf8'));
}

for (const [file, definitionId, version] of fixtures) {
  test(`${file} is a canonical OpenForm Record fixture`, async () => {
    const record = await load(file);
    assert.equal(record.spec, 'openform/record/v1');
    assert.match(record.id, /^rec_[A-Za-z0-9_-]+$/);
    assert.deepEqual(record.definition, { id: definitionId, version });
    assert.ok(Number.isFinite(Date.parse(record.created_at)));
    assert.ok(Number.isFinite(Date.parse(record.updated_at)));
    assert.equal(typeof record.data, 'object');
    assert.ok(record.data && !Array.isArray(record.data));
  });
}

test('workout fixture demonstrates recursive collection data', async () => {
  const record = await load('workout.record.json');
  assert.ok(Array.isArray(record.data.exercises));
  assert.ok(record.data.exercises.length > 0);
  assert.ok(Array.isArray(record.data.exercises[0].sets));
  assert.equal(typeof record.data.exercises[0].sets[0].load, 'number');
  assert.equal(typeof record.data.exercises[0].sets[0].reps, 'number');
});

test('inspection fixture stores a stable select value', async () => {
  const record = await load('inspection.record.json');
  assert.ok(['pass', 'attention', 'fail'].includes(record.data.status));
});
