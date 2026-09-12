import express from 'express';
import cors from 'cors';
import { appsRouter } from './routes/apps.js';
import { recordsRouter } from './routes/records.js';
import { uploadsRouter } from './routes/uploads.js';

export function createApp() {
  const app = express();
  const allowedOrigin = process.env.FRONTEND_ORIGIN;

  app.use(cors(allowedOrigin ? { origin: allowedOrigin } : {}));
  app.use(express.json());

  app.get('/healthz', (req, res) => res.type('text').send('ok'));
  app.use('/api/apps', appsRouter);
  app.use('/api/apps/:appId/records', recordsRouter);
  app.use('/api/uploads', uploadsRouter);

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  });

  return app;
}
