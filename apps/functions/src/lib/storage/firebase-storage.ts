import * as admin from 'firebase-admin';
import { randomUUID } from 'node:crypto';
import { AppError } from '../../middleware/error.js';
import type { StorageProvider, PresignedUploadResult, PresignedReadResult } from './types.js';

export class FirebaseStorageProvider implements StorageProvider {
  private bucket: import('firebase-admin/storage').Bucket;

  constructor() {
    if (!admin.apps.length) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase credentials are not properly configured.');
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      throw new Error('FIREBASE_STORAGE_BUCKET is not configured.');
    }

    this.bucket = admin.storage().bucket(bucketName);
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  async createPresignedUpload(
    tenantId: string,
    module: string,
    entityId: string,
    filename: string,
    contentType: string,
    sizeBytes: number
  ): Promise<PresignedUploadResult> {
    const maxBytes = Number(process.env.MAX_UPLOAD_BYTES || '52428800');
    if (sizeBytes > maxBytes) {
      throw new AppError(`File size exceeds maximum allowed of ${maxBytes} bytes`, 400);
    }

    const safeFilename = this.sanitizeFilename(filename);
    const key = `schools/${tenantId}/${module}/${entityId}/${randomUUID()}-${safeFilename}`;

    const file = this.bucket.file(key);

    const ttlSeconds = Number(process.env.FIREBASE_SIGNED_URL_TTL_SECONDS || '900');
    const expires = Date.now() + ttlSeconds * 1000;

    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires,
      contentType,
      extensionHeaders: {
        'x-goog-content-length-range': `0,${maxBytes}`,
      }
    });

    return {
      uploadUrl,
      bucket: this.bucket.name,
      key,
    };
  }

  async createPresignedReadUrl(bucket: string, key: string): Promise<PresignedReadResult> {
    if (bucket !== this.bucket.name) {
      this.bucket = admin.storage().bucket(bucket);
    }

    const file = this.bucket.file(key);
    
    const ttlSeconds = Number(process.env.FIREBASE_SIGNED_URL_TTL_SECONDS || '900');
    const expires = Date.now() + ttlSeconds * 1000;

    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires,
    });

    return { downloadUrl };
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    if (bucket !== this.bucket.name) {
      this.bucket = admin.storage().bucket(bucket);
    }

    const file = this.bucket.file(key);
    try {
      await file.delete();
    } catch (err: any) {
      if (err.code !== 404) {
        throw err;
      }
    }
  }
}
