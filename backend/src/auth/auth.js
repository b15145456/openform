import { betterAuth } from 'better-auth';
import { admin as adminPlugin, bearer } from 'better-auth/plugins';
import { pool } from '../db.js';

// Global roles are intentionally minimal: 'admin' (manage users, bypass all
// per-app checks) and the default 'user' (a regular colleague). Per-app
// access (owner/editor/viewer on a specific App) is authorized separately
// via OpenFGA — see src/authz/fga.js — not through Better Auth roles.

export function createAuth() {
  return betterAuth({
    database: pool,
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || 3000}`,
    trustedOrigins: [process.env.FRONTEND_ORIGIN].filter(Boolean),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
    plugins: [adminPlugin(), bearer()],
  });
}
