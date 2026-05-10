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
        {label && <label className="text-xs font-bold text-slate-400 uppercase ml-1">{label}</label>}
        <input
          ref={ref}
          className={cn(
            "w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm",
            error && "border-red-300 focus:ring-red-100",
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
