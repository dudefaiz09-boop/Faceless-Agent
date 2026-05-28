import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { getSupabaseAccessToken } from '../lib/supabase';
import { env } from '../lib/env';
import { getActiveTenantId } from '../lib/tenant';

interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  /**
   * Legacy path string used to derive module/entityId.
   * Format: "{module}/{entityId}", e.g. "submissions/assignment-123/user-456"
   * or "library/resources" or "announcements/user-id"
   */
  path: string;
  label?: string;
  accept?: string;
}

/**
 * Parse the legacy `path` prop into module/entityId for the new backend API.
 * - "submissions/{assignmentId}/{userId}" → module=assignments, entityId={assignmentId}
 * - "library/resources"                  → module=library,      entityId=general
 * - "announcements/{userId}"             → module=announcements, entityId=general
 * - fallback                             → module=documents,    entityId=general
 */
function parsePath(path: string): { module: string; entityId: string } {
  const segments = path.split('/').filter(Boolean);
  const first = segments[0] || 'documents';
  const second = segments[1] || 'general';

  if (first === 'submissions') {
    // submissions/{assignmentId}/{userId}
    return { module: 'assignments', entityId: second };
  }
  if (first === 'library') {
    return { module: 'library', entityId: 'general' };
  }
  if (first === 'announcements') {
    return { module: 'announcements', entityId: 'general' };
  }
  return { module: first, entityId: second === 'general' ? 'general' : second };
}

const MAX_FILE_SIZE_BYTES = 52428800; // 50 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'application/zip',
]);

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  path,
  label = 'Upload File',
  accept = '*',
}) => {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setFileName(file.name);
    setProgress(5);

    try {
      // Client-side validation
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File is too large. Maximum allowed size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`);
      }

      const { module, entityId } = parsePath(path);
      const baseUrl = env.VITE_API_BASE_URL;
      const token = await getSupabaseAccessToken();
      const tenantId = getActiveTenantId();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (tenantId) headers['X-Tenant-ID'] = tenantId;

      // Step 1: Request a presigned upload URL from the backend
      setProgress(15);
      const presignRes = await fetch(`${baseUrl}/documents/presign-upload`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          module,
          entityId,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        }),
      });

      if (!presignRes.ok) {
        const errBody = await presignRes.json().catch(() => ({})) as { message?: string };
        throw new Error(errBody.message || `Presign request failed (${presignRes.status})`);
      }

      const presignData = await presignRes.json() as { data: { uploadUrl: string; bucket: string; key: string } };
      const { uploadUrl, bucket, key } = presignData.data;

      setProgress(30);

      // Step 2: Upload the binary file directly to Firebase Storage via the signed URL
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Storage upload failed (${uploadRes.status}). Please try again.`);
      }

      setProgress(80);

      // Step 3: Notify the backend to save metadata in Supabase
      const completeRes = await fetch(`${baseUrl}/documents/complete-upload`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider: 'firebase',
          bucket,
          key,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          module,
          entityId,
        }),
      });

      if (!completeRes.ok) {
        const errBody = await completeRes.json().catch(() => ({})) as { message?: string };
        throw new Error(errBody.message || `Complete upload request failed (${completeRes.status})`);
      }

      const completeData = await completeRes.json() as { data: { id: string } };
      const documentId = completeData.data?.id;

      setProgress(100);

      // Return a backend-resolvable download URL for the document
      // The caller stores this reference; actual download is via the backend
      onUploadComplete(documentId ? `${baseUrl}/documents/${documentId}/download-url` : key);
    } catch (err) {
      console.error('[Upload Error]', err);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {label}
        </label>
      )}

      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-3',
          uploading
            ? 'bg-slate-50 border-blue-200'
            : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
        )}
      >
        <input
          aria-label={label || 'Upload file'}
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          className="hidden"
        />

        {!uploading && !fileName && (
          <>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
              <UploadCloud size={24} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-700">Click to upload</p>
              <p className="text-xs text-slate-400 mt-1">PDF, Word, or Images up to 50MB</p>
            </div>
          </>
        )}

        {uploading && (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-blue-600 uppercase">Uploading...</span>
              <span className="text-slate-400">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 text-center truncate">{fileName}</p>
          </div>
        )}

        {!uploading && fileName && !error && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-700">File Uploaded</p>
              <p className="text-xs text-slate-400 mt-1 truncate max-w-[200px]">{fileName}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600">
              <XCircle size={24} />
            </div>
            <p className="text-xs font-bold text-red-600 text-center max-w-[220px]">{error}</p>
            <p className="text-[10px] text-slate-400">Click to try again</p>
          </div>
        )}
      </div>
    </div>
  );
};
