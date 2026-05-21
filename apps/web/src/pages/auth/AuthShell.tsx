import React from 'react';
import { GraduationCap } from 'lucide-react';
import type React from 'react';
import { Link } from 'react-router-dom';

export interface AuthShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 dark:bg-slate-950">
      <div className="max-w-md w-full rounded-3xl border border-white/80 bg-white p-8 text-center shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <Link
          to="/auth/login"
          className="mx-auto mb-6 flex h-16 w-16 rotate-3 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none"
          aria-label="EduConnect home"
        >
          <GraduationCap size={32} />
        </Link>
        <h1 className="mb-2 text-3xl font-black text-slate-900 dark:text-white">{title}</h1>
        <p className="mb-8 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
        {children}
        {footer && <div className="mt-6 text-sm font-semibold text-slate-500">{footer}</div>}
      </div>
    </div>
  );
}
