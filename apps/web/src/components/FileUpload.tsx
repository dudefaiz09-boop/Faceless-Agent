import React, { useState, useRef } from 'react';
import { supabase, uploadsBucket } from '../lib/supabase';
import { UploadCloud, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  path: string;
  label?: string;
  accept?: string;
}

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

    const objectPath = `${path}/${Date.now()}_${file.name}`;

    try {
      setProgress(25);
      const { error } = await supabase.storage.from(uploadsBucket).upload(objectPath, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) throw error;

      setProgress(100);
      const { data } = supabase.storage.from(uploadsBucket).getPublicUrl(objectPath);
      onUploadComplete(data.publicUrl);
    } catch (err) {
      console.error('[Upload Error]', err);
      setError('Upload failed. Please try again.');
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
              <p className="text-xs text-slate-400 mt-1">PDF, Word, or Images up to 10MB</p>
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
              <p className="text-sm font-bold text-slate-700">File Selected</p>
              <p className="text-xs text-slate-400 mt-1 truncate max-w-[200px]">{fileName}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600">
              <XCircle size={24} />
            </div>
            <p className="text-xs font-bold text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
