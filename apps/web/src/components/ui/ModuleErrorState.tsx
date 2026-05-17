import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from './Button';

interface ModuleErrorStateProps {
  moduleName: string;
  error?: string | Error;
  onRetry?: () => void;
}

export const ModuleErrorState: React.FC<ModuleErrorStateProps> = ({
  moduleName,
  error,
  onRetry,
}) => {
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'An unexpected error occurred while loading this module.';

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white rounded-3xl border border-red-100 shadow-sm dark:bg-slate-900 dark:border-red-900/30">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6 dark:bg-red-950/40">
        <AlertCircle size={32} />
      </div>
      <h2 className="text-2xl font-black text-slate-900 mb-2 dark:text-white">
        Module Error: {moduleName}
      </h2>
      <p className="text-slate-500 max-w-md mb-8 dark:text-slate-400">{errorMessage}</p>

      {onRetry && (
        <Button onClick={onRetry} variant="secondary" className="gap-2">
          <RefreshCcw size={18} />
          Retry Loading
        </Button>
      )}
    </div>
  );
};
