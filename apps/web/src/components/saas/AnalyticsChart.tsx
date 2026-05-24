import { Area, AreaChart, Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { useEffect, useRef, useState } from 'react';

interface AnalyticsChartProps {
  title: string;
  subtitle: string;
  data: Array<Record<string, string | number>>;
  dataKey: string;
  variant?: 'area' | 'bar';
}

export function AnalyticsChart({
  title,
  subtitle,
  data,
  dataKey,
  variant = 'area',
}: AnalyticsChartProps) {
  const Chart = variant === 'bar' ? BarChart : AreaChart;
  const chartFrameRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = chartFrameRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      if (width > 0 && height > 0) {
        setChartSize((current) =>
          current.width === width && current.height === height ? current : { width, height }
        );
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="rounded-[30px] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-200/60 backdrop-blur">
      <div className="mb-5">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="text-sm font-medium text-slate-500">{subtitle}</p>
      </div>
      <div ref={chartFrameRef} className="h-72 min-h-[18rem] w-full min-w-0">
        {chartSize.width > 0 && chartSize.height > 0 && (
          <Chart
            data={data}
            width={chartSize.width}
            height={chartSize.height}
            margin={{ left: -20, right: 8, top: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id={`${dataKey}-gradient`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.36} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ stroke: '#2563eb', strokeWidth: 1 }}
              contentStyle={{
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
              }}
            />
            {variant === 'bar' ? (
              <Bar dataKey={dataKey} radius={[12, 12, 4, 4]} fill="#2563eb" />
            ) : (
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke="#2563eb"
                strokeWidth={3}
                fill={`url(#${dataKey}-gradient)`}
              />
            )}
          </Chart>
        )}
      </div>
    </section>
  );
}
