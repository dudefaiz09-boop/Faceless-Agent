import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export const PageHeader = ({ title, description, children }: PageHeaderProps) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
    <div className="space-y-2">
      <h1 className="text-3xl font-black text-slate-900 tracking-tight dark:text-white">
        {title}
      </h1>
      {description && (
        <p className="text-slate-500 font-medium dark:text-slate-400">
          {description}
        </p>
      )}
    </div>
    {children && <div className="flex items-center gap-4">{children}</div>}
  </div>
);
