import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

// Regression test for a real production incident: ensureFga() cached a
// *rejected* promise forever once OpenFGA failed to respond a single time —
// so once a backend process saw OpenFGA unreachable at boot, every FGA
// operation kept failing for that process's entire lifetime, even after
// OpenFGA came back up and started serving traffic normally. Only a full
// backend restart recovered. This dedicates its own port (distinct from the
// OpenFGA container CI starts for api.test.js) and controls that port's
// container lifecycle directly, so it can prove: same URL, first call fails
// while nothing is listening, second call succeeds once a real OpenFGA
// container is actually up on that same port — no process restart involved.
const PORT = 18099;
const CONTAINER = 'openform-fga-retry-test';
process.env.FGA_API_URL = `http://localhost:${PORT}`;

const { ensureFga } = await import('../src/authz/fga.js');

test('ensureFga() retries after a transient failure instead of caching it forever', async () => {
  // Nothing is listening on PORT yet — this must fail.
  await assert.rejects(() => ensureFga());

  execSync(`docker run -d --name ${CONTAINER} -p ${PORT}:8080 openfga/openfga run`, { stdio: 'ignore' });
  try {
    let healthy = false;
    for (let i = 0; i < 30 && !healthy; i++) {
      try {
        const res = await fetch(`http://localhost:${PORT}/healthz`);
        healthy = res.ok;
      } catch {
        /* not up yet */
      }
      if (!healthy) await new Promise((r) => setTimeout(r, 1000));
    }
    assert.ok(healthy, 'OpenFGA container did not become healthy in time');

    // The actual regression: without the fix, this reuses the cached
    // rejected promise from the first attempt and fails forever, even
    // though the exact same URL is now serving real traffic.
    const client = await ensureFga();
    assert.ok(client.storeId, 'expected a store to have been created/found');
  } finally {
    execSync(`docker rm -f ${CONTAINER}`, { stdio: 'ignore' });
  }
});
