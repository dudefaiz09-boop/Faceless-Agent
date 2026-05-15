export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-28 animate-pulse rounded-[28px] border border-slate-100 bg-gradient-to-r from-slate-100 via-white to-slate-100"
        />
      ))}
    </div>
  );
}
