"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Film, Play, Download, Trash2, Loader2, CheckCircle, XCircle } from "lucide-react";

export default function VideoPreviewPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState<string | null>(null);

  const loadVideos = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/videos/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setVideos(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVideos(); }, []);

  const handleRender = async (videoId: string) => {
    setRendering(videoId);
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`/api/v1/videos/${videoId}/render`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadVideos();
    } catch {} finally {
      setRendering(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`/api/v1/videos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch {}
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-600",
      generating: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      queued_for_review: "bg-amber-100 text-amber-700",
      approved: "bg-brand-100 text-brand-700",
      rejected: "bg-red-100 text-red-700",
    };
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors[status] || "bg-gray-100 text-gray-600"}`}>
        {status.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Video Preview</h2>
        <button
          onClick={() => router.push("/idea-queue")}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          New from Idea
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading videos...</p>
      ) : videos.length === 0 ? (
        <div className="text-center py-16">
          <Film size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No videos yet. Generate ideas and write scripts first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {videos.map((video) => (
            <div key={video.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-[9/16] bg-gray-900 flex items-center justify-center">
                {video.status === "completed" && video.file_path ? (
                  <video src={`http://localhost:8000/${video.file_path}`} className="w-full h-full object-cover" controls />
                ) : (
                  <Film size={48} className="text-gray-600" />
                )}
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  {statusBadge(video.status)}
                  {video.duration_seconds && (
                    <span className="text-xs text-gray-400">{video.duration_seconds}s</span>
                  )}
                </div>

                <h3 className="font-semibold text-sm truncate">{video.title}</h3>

                <div className="flex items-center gap-2 mt-3">
                  {video.status === "draft" && (
                    <button
                      onClick={() => handleRender(video.id)}
                      disabled={rendering === video.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white rounded text-xs font-medium hover:bg-brand-700 disabled:opacity-50"
                    >
                      {rendering === video.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                      {rendering === video.id ? "Rendering..." : "Render"}
                    </button>
                  )}
                  {video.status === "completed" && video.file_path && (
                    <a
                      href={`http://localhost:8000/${video.file_path}`}
                      download
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200"
                    >
                      <Download size={12} /> Download
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 ml-auto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
