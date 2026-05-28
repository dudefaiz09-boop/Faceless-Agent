"use client";

import { useEffect, useState } from "react";

export default function OverviewPage() {
  const [stats, setStats] = useState({ niches: 0, trends: 0, ideas: 0, scripts: 0 });

  useEffect(() => {
    async function load() {
      try {
        const [niches, trends, ideas, scripts] = await Promise.all([
          fetch("/api/v1/niches/", { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }),
          fetch("/api/v1/trends/", { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }),
          fetch("/api/v1/ideas/", { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }),
          fetch("/api/v1/scripts/", { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }),
        ]);
        setStats({
          niches: (await niches.json()).length,
          trends: (await trends.json()).length,
          ideas: (await ideas.json()).length,
          scripts: (await scripts.json()).length,
        });
      } catch {}
    }
    load();
  }, []);

  const cards = [
    { label: "Niches", value: stats.niches, color: "bg-blue-50 text-blue-700" },
    { label: "Trends", value: stats.trends, color: "bg-purple-50 text-purple-700" },
    { label: "Ideas", value: stats.ideas, color: "bg-amber-50 text-amber-700" },
    { label: "Scripts", value: stats.scripts, color: "bg-green-50 text-green-700" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-xl p-6 ${card.color}`}>
            <p className="text-sm font-medium opacity-80">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-3">Quick Start</h3>
          <ol className="space-y-3 text-sm text-gray-600">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">1</span>
              Create a <a href="/trend-research" className="text-brand-600 hover:underline mx-1">niche</a> and research trends
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">2</span>
              Generate <a href="/idea-queue" className="text-brand-600 hover:underline mx-1">video ideas</a> from trends
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">3</span>
              Write <a href="/script-editor" className="text-brand-600 hover:underline mx-1">scripts</a> for each idea
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">4</span>
              Review quality, check compliance, and publish
            </li>
          </ol>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-3">Content Pipeline</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(100, stats.niches * 20)}%` }} />
              </div>
              <span className="text-sm text-gray-500 w-16 text-right">{stats.niches} niches</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, stats.trends * 10)}%` }} />
              </div>
              <span className="text-sm text-gray-500 w-16 text-right">{stats.trends} trends</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, stats.ideas * 8)}%` }} />
              </div>
              <span className="text-sm text-gray-500 w-16 text-right">{stats.ideas} ideas</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, stats.scripts * 6)}%` }} />
              </div>
              <span className="text-sm text-gray-500 w-16 text-right">{stats.scripts} scripts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
