import { Router } from 'express';
import { pool } from '../db.js';
import { validateDefinition } from '../../../shared/runtime.js';

export const appsRouter = Router();

appsRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.spec,
              COUNT(r.id)::int AS record_count
       FROM apps a
       LEFT JOIN records r ON r.app_id = a.id
       GROUP BY a.id
       ORDER BY a.created_at ASC`
    );
    res.json(rows.map((row) => ({ app: row.spec.app, record_count: row.record_count })));
  } catch (e) {
    next(e);
  }
});

appsRouter.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT spec FROM apps WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'app not found' });
    res.json(rows[0].spec);
  } catch (e) {
    next(e);
  }
});

appsRouter.post('/', async (req, res, next) => {
  try {
    const def = req.body;
    const errs = validateDefinition(def);
    if (errs.length) return res.status(400).json({ error: errs.join('; ') });
    await pool.query(
      `INSERT INTO apps (id, spec, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (id) DO UPDATE SET spec = EXCLUDED.spec, updated_at = now()`,
      [def.app.id, def]
    );
    res.status(201).json(def);
  } catch (e) {
    next(e);
  }
});

appsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM apps WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'app not found' });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default appsRouter;
