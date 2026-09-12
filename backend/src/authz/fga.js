import { OpenFgaClient, CredentialsMethod } from '@openfga/sdk';

const STORE_NAME = 'openform';

const AUTH_MODEL = {
  schema_version: '1.1',
  type_definitions: [
    { type: 'user' },
    {
      type: 'app',
      relations: {
        owner: { this: {} },
        editor: { union: { child: [{ this: {} }, { computedUserset: { relation: 'owner' } }] } },
        viewer: { union: { child: [{ this: {} }, { computedUserset: { relation: 'editor' } }] } },
      },
      metadata: {
        relations: {
          owner: { directly_related_user_types: [{ type: 'user' }] },
          // editor/viewer also accept the user:* wildcard, so first-party
          // starter templates can be granted to "any authenticated user"
          // instead of needing an explicit tuple per colleague.
          editor: { directly_related_user_types: [{ type: 'user' }, { type: 'user', wildcard: {} }] },
          viewer: { directly_related_user_types: [{ type: 'user' }, { type: 'user', wildcard: {} }] },
        },
      },
    },
  ],
};

let client = null;
let ready = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.FGA_API_KEY;
    client = new OpenFgaClient({
      apiUrl: process.env.FGA_API_URL || 'http://localhost:8080',
      ...(apiKey
        ? { credentials: { method: CredentialsMethod.ApiToken, config: { token: apiKey, headerName: 'Authorization', headerValuePrefix: 'Bearer' } } }
        : {}),
    });
  }
  return client;
}

export function ensureFga() {
  if (ready) return ready;
  ready = (async () => {
    const c = getClient();
    const { stores } = await c.listStores();
    let store = stores.find((s) => s.name === STORE_NAME);
    if (!store) store = await c.createStore({ name: STORE_NAME });
    c.storeId = store.id;

    const { authorization_models } = await c.readAuthorizationModels();
    let modelId = authorization_models[0]?.id;
    if (!modelId) {
      const written = await c.writeAuthorizationModel(AUTH_MODEL);
      modelId = written.authorization_model_id;
    }
    c.authorizationModelId = modelId;
    return c;
  })();
  return ready;
}

export async function grantAppAccess(appId, userId, relation) {
  const c = await ensureFga();
  await c.write({ writes: [{ user: `user:${userId}`, relation, object: `app:${appId}` }] });
}

// Grants access to any authenticated user (via the user:* wildcard) — used
// only for first-party starter templates seeded at boot, which are meant to
// be usable by every colleague by default rather than shared one by one.
export async function grantPublicAppAccess(appId, relation) {
  const c = await ensureFga();
  try {
    await c.write({ writes: [{ user: 'user:*', relation, object: `app:${appId}` }] });
  } catch (e) {
    if (!String(e?.message || '').includes('already exists')) throw e;
  }
}

export async function revokeAppAccess(appId, userId, relation) {
  const c = await ensureFga();
  await c.write({ deletes: [{ user: `user:${userId}`, relation, object: `app:${appId}` }] });
}

export async function canAccessApp(appId, userId, relation) {
  const c = await ensureFga();
  const { allowed } = await c.check({ user: `user:${userId}`, relation, object: `app:${appId}` });
  return allowed;
}

// Highest relation this specific user holds on this app ('owner' > 'editor' >
// 'viewer'), or null if they have none. Used so the frontend can show/hide
// action buttons without guessing — it does not apply the global role cap
// (viewer-tier accounts), callers combine this with req.user.role themselves.
export async function getUserRelation(appId, userId) {
  if (await canAccessApp(appId, userId, 'owner')) return 'owner';
  if (await canAccessApp(appId, userId, 'editor')) return 'editor';
  if (await canAccessApp(appId, userId, 'viewer')) return 'viewer';
  return null;
}

export async function listAccessibleApps(userId, relation) {
  const c = await ensureFga();
  const { objects } = await c.listObjects({ user: `user:${userId}`, relation, type: 'app' });
  return objects.map((o) => o.split(':')[1]);
}

export async function listAppGrants(appId) {
  const c = await ensureFga();
  const { tuples } = await c.read({ object: `app:${appId}` });
  return tuples.map((t) => ({ userId: t.key.user.replace('user:', ''), relation: t.key.relation }));
}

export async function deleteAllAppTuples(appId) {
  const c = await ensureFga();
  const { tuples } = await c.read({ object: `app:${appId}` });
  if (!tuples.length) return;
  await c.write({ deletes: tuples.map((t) => ({ user: t.key.user, relation: t.key.relation, object: t.key.object })) });
}
