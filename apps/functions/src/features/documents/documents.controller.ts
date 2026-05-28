import type { Request, Response } from 'express';
import { z } from 'zod';
import { getStorageProvider } from '../../lib/storage/index.js';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import { tryGetTenantId } from '../../lib/context.js';
import { AppError } from '../../middleware/error.js';
import { randomUUID } from 'node:crypto';

const presignUploadSchema = z.object({
  module: z.string().min(1),
  entityId: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().positive(),
});

const completeUploadSchema = z.object({
  provider: z.string().min(1),
  bucket: z.string().min(1),
  key: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().positive(),
  module: z.string().min(1),
  entityId: z.string().min(1),
});

export class DocumentsController {
  static async presignUpload(req: Request, res: Response) {
    const tenantId = tryGetTenantId();
    if (!tenantId) {
      throw new AppError('Tenant context is required', 400);
    }

    const body = presignUploadSchema.parse(req.body);

    const provider = getStorageProvider();
    const result = await provider.createPresignedUpload(
      tenantId,
      body.module,
      body.entityId,
      body.filename,
      body.contentType,
      body.sizeBytes
    );

    return res.json({
      status: 'success',
      data: result,
    });
  }

  static async completeUpload(req: Request, res: Response) {
    const tenantId = tryGetTenantId();
    if (!tenantId) {
      throw new AppError('Tenant context is required', 400);
    }

    const body = completeUploadSchema.parse(req.body);

    // Verify key belongs to tenant
    if (!body.key.startsWith(`schools/${tenantId}/`)) {
      throw new AppError('Storage key does not belong to the current tenant', 403);
    }

    const supabaseAdmin = getSupabaseAdmin();
    const id = randomUUID();

    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert({
        collection: 'attachments',
        id,
        data: {
          tenantId,
          schoolId: tenantId,
          module: body.module,
          entityId: body.entityId,
          uploadedBy: req.user?.uid,
        },
        storage_provider: body.provider,
        storage_bucket: body.bucket,
        storage_key: body.key,
        mime_type: body.contentType,
        file_size_bytes: body.sizeBytes,
        original_filename: body.filename,
      })
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to save document metadata: ${error.message}`, 500);
    }

    return res.json({
      status: 'success',
      data,
    });
  }

  static async getDownloadUrl(req: Request, res: Response) {
    const tenantId = tryGetTenantId();
    const documentId = req.params.id;

    if (!tenantId) {
      throw new AppError('Tenant context is required', 400);
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: doc, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !doc) {
      throw new AppError('Document not found', 404);
    }

    // Verify tenant
    if (doc.data?.tenantId && doc.data.tenantId !== tenantId) {
      throw new AppError('Unauthorized access to document', 403);
    }

    const providerName = doc.storage_provider || 'supabase';
    const provider = getStorageProvider(providerName);

    const bucket = doc.storage_bucket || process.env.SUPABASE_UPLOADS_BUCKET || 'educonnect-uploads';
    const key = doc.storage_key || doc.data?.objectPath || '';

    if (!key) {
      throw new AppError('Storage key is missing for this document', 400);
    }

    const result = await provider.createPresignedReadUrl(bucket, key);

    return res.json({
      status: 'success',
      data: result,
    });
  }

  static async deleteDocument(req: Request, res: Response) {
    const tenantId = tryGetTenantId();
    const documentId = req.params.id;

    if (!tenantId) {
      throw new AppError('Tenant context is required', 400);
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: doc, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !doc) {
      throw new AppError('Document not found', 404);
    }

    if (doc.data?.tenantId && doc.data.tenantId !== tenantId) {
      throw new AppError('Unauthorized access to document', 403);
    }

    const providerName = doc.storage_provider || 'supabase';
    const bucket = doc.storage_bucket || process.env.SUPABASE_UPLOADS_BUCKET || 'educonnect-uploads';
    const key = doc.storage_key || doc.data?.objectPath || '';

    if (key) {
      const provider = getStorageProvider(providerName);
      try {
        await provider.deleteObject(bucket, key);
      } catch (err: any) {
        console.warn(`Failed to delete object from storage: ${err.message}`);
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      throw new AppError(`Failed to delete document metadata: ${deleteError.message}`, 500);
    }

    return res.json({
      status: 'success',
      message: 'Document deleted successfully',
    });
  }
}
