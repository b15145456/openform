import { Router } from 'express';
import { pool } from '../db.js';
import { requireRole } from '../auth/middleware.js';

export const auditLogRouter = Router();

auditLogRouter.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const before = req.query.before ? new Date(req.query.before) : null;
    const { rows } = await pool.query(
      `SELECT id, actor_user_id, actor_email, action, entity_type, entity_id, app_id, detail, created_at
       FROM audit_log
       WHERE $1::timestamptz IS NULL OR created_at < $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [before, limit]
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

export default auditLogRouter;
