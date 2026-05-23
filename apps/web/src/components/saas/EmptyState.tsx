import type { LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      className="flex min-h-64 flex-col items-center justify-center rounded-[30px] border border-dashed border-slate-200 bg-white/70 p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-300">
        <Icon size={28} aria-hidden="true" />
      </div>
      <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-2 max-w-sm text-sm font-medium text-slate-500 dark:text-slate-300">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
