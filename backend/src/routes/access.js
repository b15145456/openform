import { Router } from 'express';
import { pool } from '../db.js';
import { requireAppAccess } from '../auth/middleware.js';
import { listAppGrants, grantAppAccess, revokeAppAccess } from '../authz/fga.js';
import { recordAudit } from '../audit.js';

export const accessRouter = Router({ mergeParams: true });

const RELATIONS = ['viewer', 'editor', 'owner'];

accessRouter.get('/', requireAppAccess('owner'), async (req, res, next) => {
  try {
    const grants = await listAppGrants(req.params.id);
    const userIds = grants.map((g) => g.userId);
    let emailById = {};
    if (userIds.length) {
      const { rows } = await pool.query('SELECT id, email FROM "user" WHERE id = ANY($1)', [userIds]);
      emailById = Object.fromEntries(rows.map((r) => [r.id, r.email]));
    }
    res.json(grants.map((g) => ({ ...g, email: emailById[g.userId] || null })));
  } catch (e) {
    next(e);
  }
});

accessRouter.post('/', requireAppAccess('owner'), async (req, res, next) => {
  try {
    const { email, relation } = req.body || {};
    if (!RELATIONS.includes(relation)) return res.status(400).json({ error: 'relation must be viewer, editor, or owner' });
    const { rows } = await pool.query('SELECT id FROM "user" WHERE email = $1', [email]);
    if (!rows.length) return res.status(404).json({ error: `找不到 email 是 ${email} 的使用者，請先請管理員建立帳號` });
    await grantAppAccess(req.params.id, rows[0].id, relation);
    await recordAudit(req, {
      action: 'app.share',
      entityType: 'app',
      entityId: req.params.id,
      appId: req.params.id,
      detail: { granted_to: email, relation },
    });
    res.status(201).json({ userId: rows[0].id, email, relation });
  } catch (e) {
    next(e);
  }
});

accessRouter.delete('/:userId', requireAppAccess('owner'), async (req, res, next) => {
  try {
    const grants = await listAppGrants(req.params.id);
    const mine = grants.filter((g) => g.userId === req.params.userId);
    if (!mine.length) return res.status(404).json({ error: 'grant not found' });
    await Promise.all(mine.map((g) => revokeAppAccess(req.params.id, g.userId, g.relation)));
    await recordAudit(req, {
      action: 'app.unshare',
      entityType: 'app',
      entityId: req.params.id,
      appId: req.params.id,
      detail: { revoked_from: req.params.userId },
    });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default accessRouter;
