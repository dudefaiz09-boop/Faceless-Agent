"use client";

import { useEffect, useState } from "react";
import { BarChart3, Eye, ThumbsUp, MessageCircle, Share2, DollarSign, TrendingUp, Loader2 } from "lucide-react";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total_views: 0, total_likes: 0, total_comments: 0, total_shares: 0, total_saves: 0 });
  const [revenueSummary, setRevenueSummary] = useState({ total_revenue: 0, by_source: {} as Record<string, { total: number; count: number }> });
  const [snapshots, setSnapshots] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };
      const [sumRes, revRes, snapRes] = await Promise.all([
        fetch("/api/v1/analytics/snapshots/summary", { headers }),
        fetch("/api/v1/analytics/revenue/summary", { headers }),
        fetch("/api/v1/analytics/snapshots", { headers }),
      ]);
      if (sumRes.ok) setSummary(await sumRes.json());
      if (revRes.ok) setRevenueSummary(await revRes.json());
      if (snapRes.ok) setSnapshots(await snapRes.json());
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCollect = async () => {
    try {
      const token = localStorage.getItem("access_token");
      await fetch("/api/v1/analytics/collect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadData();
    } catch {}
  };

  const statCards = [
    { label: "Views", value: summary.total_views.toLocaleString(), icon: Eye, color: "bg-blue-50 text-blue-700" },
    { label: "Likes", value: summary.total_likes.toLocaleString(), icon: ThumbsUp, color: "bg-green-50 text-green-700" },
    { label: "Comments", value: summary.total_comments.toLocaleString(), icon: MessageCircle, color: "bg-purple-50 text-purple-700" },
    { label: "Shares", value: summary.total_shares.toLocaleString(), icon: Share2, color: "bg-amber-50 text-amber-700" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Analytics</h2>
        <button
          onClick={handleCollect}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Loader2 size={16} /> Collect Now
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading analytics...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={`rounded-xl p-5 ${card.color}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={16} />
                    <p className="text-xs font-medium opacity-80">{card.label}</p>
                  </div>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign size={16} className="text-green-600" /> Revenue
              </h3>
              <p className="text-3xl font-bold text-green-600">${revenueSummary.total_revenue.toFixed(2)}</p>
              <div className="mt-3 space-y-1">
                {Object.entries(revenueSummary.by_source).map(([source, data]) => (
                  <div key={source} className="flex justify-between text-sm">
                    <span className="text-gray-600 capitalize">{source.replace(/_/g, " ")}</span>
                    <span className="font-medium">${data.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-brand-600" /> Recent Snapshots
              </h3>
              {snapshots.length === 0 ? (
                <p className="text-sm text-gray-500">No data yet. Click "Collect Now" to fetch analytics.</p>
              ) : (
                <div className="space-y-2">
                  {snapshots.slice(0, 5).map((snap) => (
                    <div key={snap.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{new Date(snap.snapshot_date).toLocaleDateString()}</span>
                      <span className="font-medium">{snap.views} views</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
