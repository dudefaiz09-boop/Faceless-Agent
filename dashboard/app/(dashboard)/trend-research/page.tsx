"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Plus, Trash2, Search } from "lucide-react";

export default function TrendResearchPage() {
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [nicheName, setNicheName] = useState("");
  const [nicheDesc, setNicheDesc] = useState("");
  const [showNicheForm, setShowNicheForm] = useState(false);

  const loadTrends = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/trends/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTrends(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTrends(); }, []);

  const handleResearch = async () => {
    setResearching(true);
    try {
      const token = localStorage.getItem("access_token");

      if (showNicheForm && nicheName) {
        await fetch("/api/v1/niches/", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: nicheName, description: nicheDesc }),
        });
        setNicheName("");
        setNicheDesc("");
        setShowNicheForm(false);
      }

      await fetch("/api/v1/trends/research", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadTrends();
    } catch {} finally {
      setResearching(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`/api/v1/trends/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrends((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Trend Research</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNicheForm(!showNicheForm)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Plus size={16} /> New Niche
          </button>
          <button
            onClick={handleResearch}
            disabled={researching}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <Search size={16} /> {researching ? "Researching..." : "Research Trends"}
          </button>
        </div>
      </div>

      {showNicheForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-3">
          <input
            placeholder="Niche name (e.g., AI Tools)"
            value={nicheName}
            onChange={(e) => setNicheName(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
          />
          <input
            placeholder="Description (optional)"
            value={nicheDesc}
            onChange={(e) => setNicheDesc(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading trends...</p>
      ) : trends.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No trends yet. Create a niche and research trends to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {trends.map((trend) => (
            <div key={trend.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm leading-tight flex-1">{trend.trend_name}</h3>
                <button onClick={() => handleDelete(trend.id)} className="p-1 text-gray-400 hover:text-red-500 ml-2">
                  <Trash2 size={14} />
                </button>
              </div>
              {trend.category && <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded mb-2">{trend.category}</span>}
              <div className="flex gap-3 text-xs text-gray-500 mb-2">
                <span>Virality: <strong className="text-brand-600">{trend.virality_score}/10</strong></span>
                <span>Competition: <strong className="text-amber-600">{trend.competition_score}/10</strong></span>
              </div>
              {trend.suggested_hook && (
                <p className="text-xs text-gray-600 italic line-clamp-2">&ldquo;{trend.suggested_hook}&rdquo;</p>
              )}
              {trend.suggested_hashtags && (
                <p className="text-xs text-gray-400 mt-2 truncate">{trend.suggested_hashtags}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
