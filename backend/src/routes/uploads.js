import { Router } from 'express';
import { presignUpload, publicUrl, storageConfigured } from '../storage.js';

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
    if (!storageConfigured()) {
      return res
        .status(503)
        .json({ error: '伺服器未設定物件儲存（缺少 AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_ENDPOINT_URL_S3），無法上傳' });
    }
    const key = `${crypto.randomUUID()}${safeExtension(filename)}`;
    const uploadUrl = await presignUpload(key, contentType);
    res.status(201).json({ key, uploadUrl, publicUrl: publicUrl(key) });
  } catch (e) {
    next(e);
  }
});

export default uploadsRouter;
