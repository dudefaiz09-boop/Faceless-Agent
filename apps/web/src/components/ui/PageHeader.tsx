import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export const PageHeader = ({ title, description, children }: PageHeaderProps) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
    <div className="space-y-1">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
      {description && <p className="text-slate-500">{description}</p>}
    </div>
    {children && <div className="flex items-center gap-3">{children}</div>}
  </div>
);
