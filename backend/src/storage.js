import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = 'media';

const s3 = new S3Client({ forcePathStyle: true });

export async function presignUpload(key, contentType) {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(s3, command, { expiresIn: 300 });
}

export function publicUrl(key) {
  return `${process.env.AWS_ENDPOINT_URL_S3}/${BUCKET}/${key}`;
}
