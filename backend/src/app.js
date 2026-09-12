import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { appsRouter } from './routes/apps.js';
import { recordsRouter } from './routes/records.js';
import { uploadsRouter } from './routes/uploads.js';
import { auditLogRouter } from './routes/auditLog.js';
import { accessRouter } from './routes/access.js';
import { createAuthenticate } from './auth/middleware.js';

export function createApp(auth) {
  const app = express();
  const allowedOrigin = process.env.FRONTEND_ORIGIN;

  // credentials: true is required because the Better Auth client sends
  // fetch requests with credentials: 'include' by default (even though we
  // rely on the Bearer token, not cookies, for actual authorization) — the
  // 'cors' package's origin:true correctly reflects the request's own Origin
  // header instead of '*', which the CORS spec requires when credentials
  // are involved.
  app.use(cors({ origin: allowedOrigin || true, credentials: true }));

  // Better Auth's handler does its own body parsing; it must be mounted
  // before the global express.json() below, or it never sees the raw body.
  app.all('/api/auth/*', toNodeHandler(auth));

  app.use(express.json());

  app.get('/healthz', (req, res) => res.type('text').send('ok'));

  const authenticate = createAuthenticate(auth);
  app.use('/api/apps', authenticate, appsRouter);
  app.use('/api/apps/:id/access', authenticate, accessRouter);
  app.use('/api/apps/:appId/records', authenticate, recordsRouter);
  app.use('/api/uploads', authenticate, uploadsRouter);
  app.use('/api/audit-log', authenticate, auditLogRouter);

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  });

  return app;
}
