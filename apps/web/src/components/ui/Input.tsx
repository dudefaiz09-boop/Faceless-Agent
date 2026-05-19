import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1 w-full">
        {label && (
          <label className="text-xs font-bold text-slate-400 uppercase ml-1">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-all placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-400 dark:focus:border-blue-400 dark:focus:ring-blue-950/70 dark:disabled:text-slate-400',
            error &&
              'border-red-300 focus:ring-red-100 dark:border-red-500 dark:focus:ring-red-950/70',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500 ml-1 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
