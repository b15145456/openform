import { Router } from 'express';
import { pool } from '../db.js';
import { makeRecord } from '../../../shared/runtime.js';

export const recordsRouter = Router({ mergeParams: true });

const toResponse = (row) => ({
  spec: 'openform/record/v1',
  id: row.id,
  definition: { id: row.app_id, version: row.definition_version },
  created_at: row.created_at,
  updated_at: row.updated_at,
  data: row.data,
});

async function loadApp(appId, res) {
  const { rows } = await pool.query('SELECT spec FROM apps WHERE id = $1', [appId]);
  if (!rows.length) {
    res.status(404).json({ error: 'app not found' });
    return null;
  }
  return rows[0].spec;
}

recordsRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM records WHERE app_id = $1 ORDER BY created_at DESC',
      [req.params.appId]
    );
    res.json(rows.map(toResponse));
  } catch (e) {
    next(e);
  }
});

recordsRouter.post('/', async (req, res, next) => {
  try {
    const def = await loadApp(req.params.appId, res);
    if (!def) return;
    const record = makeRecord(def, req.body?.data ?? {});
    const { rows } = await pool.query(
      `INSERT INTO records (id, app_id, definition_version, data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [record.id, def.app.id, def.app.version, record.data, record.created_at, record.updated_at]
    );
    res.status(201).json(toResponse(rows[0]));
  } catch (e) {
    next(e);
  }
});

recordsRouter.put('/:recordId', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE records SET data = $1, updated_at = now()
       WHERE id = $2 AND app_id = $3 RETURNING *`,
      [req.body?.data ?? {}, req.params.recordId, req.params.appId]
    );
    if (!rows.length) return res.status(404).json({ error: 'record not found' });
    res.json(toResponse(rows[0]));
  } catch (e) {
    next(e);
  }
});

recordsRouter.delete('/:recordId', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM records WHERE id = $1 AND app_id = $2', [
      req.params.recordId,
      req.params.appId,
    ]);
    if (!rowCount) return res.status(404).json({ error: 'record not found' });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default recordsRouter;
