import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      className,
      id,
      name,
      'aria-describedby': describedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || name || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const ariaDescribedBy = [describedBy, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 dark:text-slate-400"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            name={name}
            aria-describedby={ariaDescribedBy}
            aria-invalid={error ? true : undefined}
            className={cn(
              'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200',
              'placeholder:text-slate-400',
              'focus:border-violet-400 focus:ring-2 focus:ring-violet-100',
              'disabled:cursor-not-allowed disabled:opacity-60',
              'dark:border-[#1e1e3a] dark:bg-[#12121e] dark:text-slate-50 dark:placeholder:text-slate-500',
              'dark:focus:border-violet-500 dark:focus:ring-violet-950/50',
              error &&
                'border-rose-300 focus:ring-rose-100 dark:border-rose-500 dark:focus:ring-rose-950/50',
              leftIcon && 'pl-11',
              rightIcon && 'pr-11',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-xs text-rose-500 ml-1 font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
