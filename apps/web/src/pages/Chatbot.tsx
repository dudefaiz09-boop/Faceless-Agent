import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import {
  Bot,
  Brain,
  GraduationCap,
  Loader2,
  RefreshCcw,
  Send,
  Sparkles,
  Wand2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api-client';
import { cn } from '../lib/utils';

interface ChatLog {
  id: string;
  query: string;
  response: string;
  timestamp: string;
  feedback?: 'helpful' | 'not_helpful' | null;
}

type AiQueryResponse = {
  success?: boolean;
  id?: string;
  response?: string;
  timestamp?: string;
};

type AiStatus = {
  enabled: boolean;
  provider: string;
  model: string;
  mode: 'live' | 'offline-fallback';
};

const modes = [
  { key: 'chat', label: 'Ask', icon: Bot },
  { key: 'lesson', label: 'Lesson', icon: GraduationCap },
  { key: 'quiz', label: 'Quiz', icon: Brain },
  { key: 'report', label: 'Report', icon: Sparkles },
  { key: 'announcement', label: 'Draft', icon: Wand2 },
] as const;

function getFriendlyAiError(err: unknown, aiStatus: AiStatus | null) {
  const message = err instanceof Error ? err.message : String(err || '');

  if (message.toLowerCase().includes('tenant')) {
    return 'AI request failed because your account is missing school/tenant context. Please sign out and sign back in, then retry.';
  }

  if (message.toLowerCase().includes('unauthorized') || message.includes('401')) {
    return 'AI request failed because your session is not active. Please sign out and sign back in, then retry.';
  }

  if (aiStatus?.enabled) {
    return 'AI request failed after reaching the API. Please retry later.';
  }

  return 'AI request failed. Please try again later.';
}

export const ChatbotPage = () => {
  const { role, isAdmin, isTeacher, canManageAssignments } = useAuth();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<(typeof modes)[number]['key']>('chat');
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const rolePrompts = useMemo(
    () => ({
      admin: 'Summarize fee collection risks and recommend next actions.',
      principal: 'Create a weekly academic leadership briefing.',
      teacher: 'Generate a 10-question quiz with answers for tomorrow.',
      student: 'Explain a difficult concept with examples and revision notes.',
      parent: 'Summarize what I should check for my child this week.',
      librarian: 'Recommend books for Grade 10 science enrichment.',
      accountant: 'Create a friendly pending-fee reminder.',
      staff: "Summarize today's support priorities.",
    }),
    []
  );

  const loadAiStatus = useCallback(async () => {
    try {
      const status = await apiClient.request<AiStatus>('/api/ai/status');
      setAiStatus(status);
    } catch (err) {
      console.error('Error loading AI status:', err);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAiStatus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAiStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, loading]);

  const sendQuery = async (event?: React.FormEvent, retryQuery?: string) => {
    event?.preventDefault();
    const currentQuery = retryQuery || query.trim();
    if (!currentQuery || loading) return;

    const previousQuery = query;
    setQuery('');
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.request<AiQueryResponse>('/api/ai/query', {
        method: 'POST',
        body: JSON.stringify({ query: currentQuery, mode }),
      });

      setLogs((prev) => [
        ...prev,
        {
          id: data.id || crypto.randomUUID(),
          query: currentQuery,
          response: data.response || 'I could not generate a response. Please try again.',
          timestamp: data.timestamp || new Date().toISOString(),
          feedback: null,
        },
      ]);
    } catch (err) {
      console.error('Failed to get AI response:', err);
      setQuery(currentQuery || previousQuery);
      setError(getFriendlyAiError(err, aiStatus));
    } finally {
      setLoading(false);
    }
  };

  const suggested = rolePrompts[role || 'student'] || rolePrompts.student;

  const isStaffOrAdmin = isAdmin || isTeacher || canManageAssignments;
  const showOfflineWarning = aiStatus && !aiStatus.enabled;

  return (
    <div className="mx-auto flex h-[calc(100vh-140px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/70 bg-white/85 shadow-2xl shadow-slate-200/70 backdrop-blur">
      {showOfflineWarning && isStaffOrAdmin && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3">
          <AlertCircle className="text-amber-600" size={18} />
          <p className="text-sm font-semibold text-amber-800">
            AI is running in offline mode. Live responses are currently unavailable.
          </p>
        </div>
      )}
      <header className="relative overflow-hidden border-b border-white/60 bg-slate-950 p-5 text-white md:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.55),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.28),transparent_32%)]" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-cyan-200 ring-1 ring-white/20">
              <Sparkles size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">EduConnect AI</h1>
              <p className="text-sm font-medium text-slate-300">
                Role-aware assistant powered by free OpenRouter models.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {modes.map((item) => (
              <button
                key={item.key}
                onClick={() => setMode(item.key)}
                className={cn(
                  'flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black uppercase tracking-widest transition-all',
                  mode === item.key
                    ? 'bg-white text-slate-950'
                    : 'bg-white/10 text-white hover:bg-white/20'
                )}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 md:p-6">
        {logs.length === 0 ? (
          <div className="mx-auto mt-12 max-w-2xl rounded-[30px] border border-dashed border-slate-200 bg-white p-8 text-center">
            <Sparkles className="mx-auto mb-4 text-blue-600" size={38} />
            <h2 className="text-2xl font-black text-slate-950">Start with a focused prompt</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{suggested}</p>
            <button
              onClick={() => setQuery(suggested)}
              className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100"
            >
              Use suggested prompt
            </button>
          </div>
        ) : (
          logs.map((log) => (
            <motion.article
              key={log.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-3"
            >
              <div className="ml-auto max-w-[86%] rounded-[24px] bg-blue-600 px-5 py-4 text-sm font-semibold leading-6 text-white shadow-lg shadow-blue-100">
                {log.query}
              </div>
              <div className="max-w-[92%] rounded-[24px] border border-slate-100 bg-white px-5 py-4 text-sm leading-7 text-slate-700 shadow-sm">
                <ReactMarkdown>{log.response}</ReactMarkdown>
              </div>
            </motion.article>
          ))
        )}

        {loading && (
          <div className="max-w-sm rounded-[24px] border border-slate-100 bg-white px-5 py-4 text-sm font-bold text-slate-500 shadow-sm">
            <Loader2 className="mr-2 inline animate-spin text-blue-600" size={16} />
            Thinking through the best answer...
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {error && (
        <div className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800">
          {error}
          <button
            onClick={() => void sendQuery(undefined, query)}
            className="ml-3 inline-flex items-center gap-1 font-black text-amber-950"
          >
            <RefreshCcw size={14} />
            Retry
          </button>
        </div>
      )}

      <form onSubmit={sendQuery} className="border-t border-slate-100 bg-white p-4">
        <div className="flex items-end gap-3 rounded-[26px] border border-slate-200 bg-slate-50 p-2 focus-within:ring-4 focus-within:ring-blue-100">
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendQuery();
              }
            }}
            placeholder={`Ask as ${role || 'student'}...`}
            rows={1}
            className="max-h-32 min-h-[48px] flex-1 resize-none bg-transparent px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
      </form>
    </div>
  );
};
