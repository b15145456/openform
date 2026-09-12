import { Router } from 'express';
import { presignUpload, publicUrl } from '../storage.js';

export const uploadsRouter = Router();

const ALLOWED_CONTENT_TYPES = /^(image|video|audio)\//;

function safeExtension(filename) {
  const match = /\.[a-zA-Z0-9]{1,8}$/.exec(String(filename || ''));
  return match ? match[0].toLowerCase() : '';
}

uploadsRouter.post('/', async (req, res, next) => {
  try {
    const { filename, contentType } = req.body || {};
    if (!contentType || !ALLOWED_CONTENT_TYPES.test(contentType)) {
      return res.status(400).json({ error: 'contentType must be image/*, video/*, or audio/*' });
    }
    const key = `${crypto.randomUUID()}${safeExtension(filename)}`;
    const uploadUrl = await presignUpload(key, contentType);
    res.status(201).json({ key, uploadUrl, publicUrl: publicUrl(key) });
  } catch (e) {
    next(e);
  }
});

export default uploadsRouter;
