"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Sparkles, Trash2, Loader2 } from "lucide-react";

export default function IdeaQueuePage() {
  const router = useRouter();
  const [ideas, setIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadIdeas = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/ideas/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setIdeas(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadIdeas(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem("access_token");
      await fetch("/api/v1/ideas/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadIdeas();
    } catch {} finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`/api/v1/ideas/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setIdeas((prev) => prev.filter((i) => i.id !== id));
    } catch {}
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    in_production: "bg-blue-100 text-blue-700",
    completed: "bg-brand-100 text-brand-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Idea Queue</h2>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? "Generating..." : "Generate Ideas"}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading ideas...</p>
      ) : ideas.length === 0 ? (
        <div className="text-center py-16">
          <Lightbulb size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No ideas yet. Research trends first, then generate ideas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/script-editor?idea_id=${idea.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColors[idea.status] || "bg-gray-100 text-gray-600"}`}>
                      {idea.status}
                    </span>
                    {idea.estimated_duration && (
                      <span className="text-xs text-gray-400">{idea.estimated_duration}s</span>
                    )}
                  </div>
                  <h3 className="font-semibold">{idea.video_title}</h3>
                  {idea.hook_1s && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{idea.hook_1s}</p>}
                  {idea.hashtags && (
                    <p className="text-xs text-gray-400 mt-2 truncate">{idea.hashtags}</p>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(idea.id); }}
                  className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
