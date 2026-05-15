import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-[30px] border border-dashed border-slate-200 bg-white/70 p-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon size={28} />
      </div>
      <h3 className="text-lg font-black text-slate-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm font-medium text-slate-500">{description}</p>
    </div>
  );
}
