"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Sparkles, Loader2 } from "lucide-react";

export default function ScriptEditorPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading...</p>}>
      <ScriptEditorContent />
    </Suspense>
  );
}

function ScriptEditorContent() {
  const searchParams = useSearchParams();
  const preselectedIdeaId = searchParams.get("idea_id");

  const [ideas, setIdeas] = useState<any[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(preselectedIdeaId);
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch("/api/v1/ideas/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setIdeas(await res.json());
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedIdeaId) return;
    async function loadScripts() {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`/api/v1/scripts/?idea_id=${selectedIdeaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setScripts(await res.json());
      } catch {}
    }
    loadScripts();
  }, [selectedIdeaId]);

  const handleGenerate = async () => {
    if (!selectedIdeaId) return;
    setGenerating(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/scripts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ idea_id: selectedIdeaId }),
      });
      if (res.ok) {
        const script = await res.json();
        setScripts((prev) => [script, ...prev]);
      }
    } catch {} finally {
      setGenerating(false);
    }
  };

  const selectedIdea = ideas.find((i) => i.id === selectedIdeaId);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Script Editor</h2>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-2">
            <label className="text-sm font-medium text-gray-700">Select an idea</label>
            <select
              value={selectedIdeaId || ""}
              onChange={(e) => setSelectedIdeaId(e.target.value || null)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            >
              <option value="">Choose an idea...</option>
              {ideas.map((idea) => (
                <option key={idea.id} value={idea.id}>
                  {idea.video_title}
                </option>
              ))}
            </select>

            {selectedIdea && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4">
                <h4 className="font-semibold text-sm mb-2">Idea Details</h4>
                <p className="text-sm text-gray-600 mb-1"><strong>Hook:</strong> {selectedIdea.hook_1s || "N/A"}</p>
                <p className="text-sm text-gray-600 mb-1"><strong>Duration:</strong> {selectedIdea.estimated_duration}s</p>
                {selectedIdea.hashtags && (
                  <p className="text-xs text-gray-400 truncate">{selectedIdea.hashtags}</p>
                )}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!selectedIdeaId || generating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors mt-4"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? "Writing..." : "Write Script"}
            </button>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {scripts.length === 0 ? (
              <div className="text-center py-16">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Select an idea and generate a script.</p>
              </div>
            ) : (
              scripts.map((script) => (
                <div key={script.id} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                    <span className="font-medium">v{script.version}</span>
                    <span>·</span>
                    <span>{script.estimated_duration_seconds}s</span>
                    {script.hook_type && (
                      <>
                        <span>·</span>
                        <span className="capitalize">{script.hook_type} hook</span>
                      </>
                    )}
                  </div>

                  <div className="prose prose-sm max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed bg-gray-50 rounded-lg p-4">
                    {script.full_script}
                  </div>

                  {script.scene_breakdown && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-1">Scene Breakdown</p>
                      <p className="text-sm text-gray-600">{script.scene_breakdown}</p>
                    </div>
                  )}

                  {script.call_to_action && (
                    <div className="mt-2 pt-2">
                      <p className="text-xs font-medium text-gray-500 mb-1">Call to Action</p>
                      <p className="text-sm text-brand-700">{script.call_to_action}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
