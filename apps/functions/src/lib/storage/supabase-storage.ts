import { getSupabaseAdmin } from '../supabase.js';
import type { StorageProvider, PresignedUploadResult, PresignedReadResult } from './types.js';

export class SupabaseStorageProvider implements StorageProvider {
  async createPresignedUpload(
    tenantId: string,
    module: string,
    entityId: string,
    filename: string,
    contentType: string,
    sizeBytes: number
  ): Promise<PresignedUploadResult> {
    throw new Error('New uploads to Supabase Storage are no longer supported. Please configure Firebase Storage.');
  }

  async createPresignedReadUrl(bucket: string, key: string): Promise<PresignedReadResult> {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(key, 60 * 60);

    if (error) {
      throw new Error(`Failed to generate signed URL for Supabase storage object: ${error.message}`);
    }

    return { downloadUrl: data.signedUrl };
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.storage.from(bucket).remove([key]);

    if (error) {
      throw new Error(`Failed to delete Supabase storage object: ${error.message}`);
    }
  }
}
