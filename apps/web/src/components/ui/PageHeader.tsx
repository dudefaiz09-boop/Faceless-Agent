import React from 'react';
import { TenantSwitcher } from '../saas/TenantSwitcher';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export const PageHeader = ({ title, description, children }: PageHeaderProps) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
    <div className="space-y-2 flex-1 min-w-0">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight dark:text-white">
          {title}
        </h1>
        <TenantSwitcher />
      </div>
      {description && (
        <p className="text-slate-500 font-medium dark:text-slate-400">{description}</p>
      )}
    </div>
    {children && <div className="flex items-center gap-4 shrink-0">{children}</div>}
  </div>
);
