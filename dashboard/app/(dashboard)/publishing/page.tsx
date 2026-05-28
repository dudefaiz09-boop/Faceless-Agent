"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Clock, CheckCircle, XCircle, RefreshCw, Loader2 } from "lucide-react";

export default function PublishingPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState<"jobs" | "posts">("jobs");

  const loadData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const [jobsRes, postsRes] = await Promise.all([
        fetch("/api/v1/publishing/jobs", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/v1/publishing/posts", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (jobsRes.ok) setJobs(await jobsRes.json());
      if (postsRes.ok) setPosts(await postsRes.json());
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem("access_token");
      await fetch("/api/v1/publishing/process", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadData();
    } catch {} finally {
      setProcessing(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-gray-100 text-gray-600",
      processing: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      retrying: "bg-amber-100 text-amber-700",
      cancelled: "bg-gray-100 text-gray-400",
    };
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors[status] || "bg-gray-100 text-gray-600"}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Publishing</h2>
        <div className="flex gap-2">
          <button
            onClick={handleProcess}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {processing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {processing ? "Processing..." : "Process Queue"}
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("jobs")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "jobs" ? "bg-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
        >
          Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setTab("posts")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "posts" ? "bg-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
        >
          Published ({posts.length})
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : tab === "jobs" ? (
        jobs.length === 0 ? (
          <div className="text-center py-16">
            <Send size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No publishing jobs yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                {statusBadge(job.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{job.action.replace(/_/g, " ")}</p>
                  {job.platform && <p className="text-xs text-gray-400">{job.platform}</p>}
                </div>
                <div className="text-right text-xs text-gray-400">
                  <p>{job.retry_count > 0 && `Retry ${job.retry_count}/${job.max_retries}`}</p>
                  {job.error_message && <p className="text-red-500 max-w-[200px] truncate">{job.error_message}</p>}
                </div>
              </div>
            ))}
          </div>
        )
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No published posts yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700">{post.platform}</span>
                {post.published_at && <span className="text-xs text-gray-400">{new Date(post.published_at).toLocaleDateString()}</span>}
              </div>
              <p className="font-medium text-sm">{post.title}</p>
              {post.platform_url && (
                <a href={post.platform_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline">
                  View on {post.platform}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
