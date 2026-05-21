import React from 'react';
import { AlertCircle, Lock, RefreshCcw, SearchX } from 'lucide-react';
import { Button } from './Button';

type ModuleStateKind = 'loading' | 'empty' | 'error' | 'unauthorized' | 'tenant-missing';

interface ModuleStateProps {
  kind: ModuleStateKind;
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ModuleState({ kind, title, message, onRetry }: ModuleStateProps) {
  if (kind === 'loading') {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const Icon = kind === 'empty' ? SearchX : kind === 'unauthorized' ? Lock : AlertCircle;
  const defaultTitle =
    kind === 'empty'
      ? 'Nothing here yet'
      : kind === 'tenant-missing'
        ? 'Tenant Context Required'
        : kind === 'unauthorized'
          ? 'Access denied'
          : 'Module error';

  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-200">
        <Icon size={28} />
      </div>
      <h2 className="text-xl font-black text-slate-950 dark:text-white">{title || defaultTitle}</h2>
      {message && (
        <p className="mt-2 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
          {message}
        </p>
      )}
      {onRetry && (
        <Button type="button" variant="secondary" className="mt-6 gap-2" onClick={onRetry}>
          <RefreshCcw size={16} />
          Retry
        </Button>
      )}
    </div>
  );
}
