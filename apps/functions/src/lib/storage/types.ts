export interface PresignedUploadResult {
  uploadUrl: string;
  bucket: string;
  key: string;
}

export interface PresignedReadResult {
  downloadUrl: string;
}

export interface StorageProvider {
  /**
   * Generates a signed URL that the client can use to upload a file directly to storage.
   */
  createPresignedUpload(
    tenantId: string,
    module: string,
    entityId: string,
    filename: string,
    contentType: string,
    sizeBytes: number
  ): Promise<PresignedUploadResult>;

  /**
   * Generates a signed URL for securely reading a private file.
   */
  createPresignedReadUrl(bucket: string, key: string): Promise<PresignedReadResult>;

  /**
   * Deletes an object from storage.
   */
  deleteObject(bucket: string, key: string): Promise<void>;
}
