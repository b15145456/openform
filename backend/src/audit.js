import { pool } from './db.js';

export async function recordAudit(req, { action, entityType, entityId, appId, detail }) {
  await pool.query(
    `INSERT INTO audit_log (actor_user_id, actor_email, action, entity_type, entity_id, app_id, detail)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [req.user?.id ?? null, req.user?.email ?? null, action, entityType, entityId, appId ?? null, detail ? JSON.stringify(detail) : null]
  );
}
