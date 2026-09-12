import { fromNodeHeaders } from 'better-auth/node';
import { canAccessApp } from '../authz/fga.js';

export function createAuthenticate(auth) {
  return async function authenticate(req, res, next) {
    try {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
      if (!session) return res.status(401).json({ error: '未登入或登入已過期' });
      req.user = session.user;
      next();
    } catch (e) {
      next(e);
    }
  };
}

export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: '未登入或登入已過期' });
    if (!allowed.includes(req.user.role)) return res.status(403).json({ error: '沒有權限執行這個操作' });
    next();
  };
}

// Per-app permission check via OpenFGA. `relation` is 'viewer' | 'editor' | 'owner'.
//
// Two layers, both must pass:
// 1. Global role cap — 'admin' bypasses everything; 'viewer' (a global,
//    account-wide view-only user) can never satisfy anything but a 'viewer'
//    check, no matter what any individual app's sharing grants them; 'user'
//    (a regular colleague) has no extra cap beyond what's granted per-app.
// 2. Per-app grant — does this specific user actually have `relation` (or
//    better) on this specific app, per OpenFGA. The app id is read from
//    req.params.id (apps routes) or req.params.appId (records routes).
export function requireAppAccess(relation) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: '未登入或登入已過期' });
    if (req.user.role === 'admin') return next();
    if (req.user.role === 'viewer' && relation !== 'viewer') {
      return res.status(403).json({ error: '你的帳號是「只能檢視」，沒有編輯權限' });
    }
    const appId = req.params.id || req.params.appId;
    try {
      const allowed = await canAccessApp(appId, req.user.id, relation);
      if (!allowed) return res.status(403).json({ error: '你沒有這個 App 的存取權限' });
      next();
    } catch (e) {
      next(e);
    }
  };
}
