import { Router } from 'express';
import { pool } from '../db.js';
import { validateDefinition } from '../../../shared/runtime.js';
import { requireAppAccess } from '../auth/middleware.js';
import { grantAppAccess, listAccessibleApps, deleteAllAppTuples, canAccessApp, getUserRelation } from '../authz/fga.js';
import { recordAudit } from '../audit.js';

export const appsRouter = Router();

appsRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.spec,
              COUNT(r.id)::int AS record_count
       FROM apps a
       LEFT JOIN records r ON r.app_id = a.id
       GROUP BY a.id
       ORDER BY a.created_at ASC`
    );
    let visible = rows;
    if (req.user.role !== 'admin') {
      const accessibleIds = new Set(await listAccessibleApps(req.user.id, 'viewer'));
      visible = rows.filter((row) => accessibleIds.has(row.id));
    }
    res.json(visible.map((row) => ({ app: row.spec.app, record_count: row.record_count })));
  } catch (e) {
    next(e);
  }
});

appsRouter.get('/:id', requireAppAccess('viewer'), async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT spec FROM apps WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'app not found' });
    const relation = req.user.role === 'admin' ? 'owner' : await getUserRelation(req.params.id, req.user.id);
    const canEdit = req.user.role !== 'viewer' && (req.user.role === 'admin' || relation === 'owner' || relation === 'editor');
    const canDelete = req.user.role === 'admin' || relation === 'owner';
    res.json({ ...rows[0].spec, _access: { role: req.user.role, relation, canEdit, canDelete } });
  } catch (e) {
    next(e);
  }
});

appsRouter.post('/', async (req, res, next) => {
  try {
    if (req.user.role === 'viewer') return res.status(403).json({ error: '你的帳號是「只能檢視」，沒有編輯權限' });
    const def = req.body;
    const errs = validateDefinition(def);
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });

    const { rows: existingRows } = await pool.query('SELECT id FROM apps WHERE id = $1', [def.app.id]);
    const isNewApp = !existingRows.length;

    if (!isNewApp && req.user.role !== 'admin') {
      const allowed = await canAccessApp(def.app.id, req.user.id, 'editor');
      if (!allowed) return res.status(403).json({ error: '你沒有這個 App 的編輯權限' });
    }

    await pool.query(
      `INSERT INTO apps (id, spec, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (id) DO UPDATE SET spec = EXCLUDED.spec, updated_at = now()`,
      [def.app.id, def]
    );
    if (isNewApp) await grantAppAccess(def.app.id, req.user.id, 'owner');

    await recordAudit(req, {
      action: isNewApp ? 'app.create' : 'app.update',
      entityType: 'app',
      entityId: def.app.id,
      appId: def.app.id,
      detail: { name: def.app.name, version: def.app.version, field_count: def.fields.length },
    });
    res.status(201).json(def);
  } catch (e) {
    next(e);
  }
});

appsRouter.delete('/:id', requireAppAccess('owner'), async (req, res, next) => {
  try {
    const { rows } = await pool.query('DELETE FROM apps WHERE id = $1 RETURNING spec', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'app not found' });
    await deleteAllAppTuples(req.params.id);
    await recordAudit(req, {
      action: 'app.delete',
      entityType: 'app',
      entityId: req.params.id,
      appId: req.params.id,
      detail: { name: rows[0].spec.app.name },
    });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default appsRouter;
