import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Database,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api-client';
import {
  DEMO_TENANT_IDS,
  getActiveTenantId,
  isDemoMode,
  setStoredTenantId,
} from '../../lib/tenant';
import { cn } from '../../lib/utils';

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
  const error = err as {
    status?: number;
    message?: string;
    data?: { error?: string; message?: string };
  };
  const status = error?.status;
  const message = error?.message || error?.data?.message || String(err || '');
  const errorData = error?.data || {};

  if (message === 'AI_TENANT_CONTEXT_MISSING') {
    return 'AI request failed: no active school was found. Select/switch a tenant, then retry.';
  }

  if (
    status === 400 &&
    (message.toLowerCase().includes('tenant') || message.toLowerCase().includes('school'))
  ) {
    return 'AI request failed: school context was not sent. Refresh the page or switch tenant, then retry.';
  }

  if (status === 401 || message.toLowerCase().includes('unauthorized')) {
    return 'AI request failed: your login session expired. Sign out and sign back in, then retry.';
  }

  if (status === 400) {
    return message || 'AI request failed due to invalid query parameters.';
  }

  if (status === 502 || errorData.error === 'AI_PROVIDER_ERROR') {
    return 'AI provider request failed. Verify API configuration on the server.';
  }

  if (
    !status &&
    (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network'))
  ) {
    return 'AI request failed: could not reach the API. Verify connection or API status.';
  }

  if (status && status >= 400) {
    return `AI request failed (Status: ${status}). ${message}`;
  }

  if (aiStatus === null) {
    return 'AI request failed. AI status is unavailable.';
  }

  return 'AI request failed. Please try again later.';
}

const contextModules = [
  { key: 'fees', label: 'Fees' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'assignments', label: 'Assignments' },
  { key: 'performance', label: 'Performance' },
  { key: 'library', label: 'Library' },
] as const;

export const GlobalChatbot = () => {
  const { role, schoolId, managedTenantIds, isAdmin, isTeacher, canManageAssignments } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<(typeof modes)[number]['key']>('chat');
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'fees',
    'attendance',
    'assignments',
    'performance',
    'library',
  ]);
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const resolveAiTenantId = useCallback(() => {
    const candidates = [
      getActiveTenantId(schoolId),
      schoolId,
      managedTenantIds[0],
      isDemoMode() ? DEMO_TENANT_IDS[0] : null,
    ].filter(Boolean) as string[];

    const tenantId = candidates[0] || null;
    if (tenantId) {
      setStoredTenantId(tenantId);
    }
    return tenantId;
  }, [managedTenantIds, schoolId]);

  const getAiHeaders = useCallback(() => {
    const tenantId = resolveAiTenantId();
    if (!tenantId) {
      throw new Error('AI_TENANT_CONTEXT_MISSING');
    }

    return {
      'x-school-id': tenantId,
      'x-tenant-id': tenantId,
      'x-user-role': role || 'student',
    };
  }, [resolveAiTenantId, role]);

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
      const tenantId = resolveAiTenantId();
      const status = await apiClient.request<AiStatus>('/api/ai/status', {
        headers: tenantId
          ? {
              'x-school-id': tenantId,
              'x-tenant-id': tenantId,
              'x-user-role': role || 'student',
            }
          : undefined,
      });
      setAiStatus(status);
    } catch (err) {
      console.error('Error loading AI status:', err);
    }
  }, [resolveAiTenantId, role]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const run = async () => {
      if (!controller.signal.aborted) {
        await loadAiStatus();
      }
    };
    void run();
    return () => controller.abort();
  }, [isOpen, loadAiStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, loading, isOpen]);

  const sendQuery = async (event?: React.FormEvent, retryQuery?: string) => {
    event?.preventDefault();
    const currentQuery = retryQuery || query.trim();
    if (!currentQuery || loading) return;

    const previousQuery = query;
    setQuery('');
    setLoading(true);
    setError(null);

    const userLogId = crypto.randomUUID();
    setLogs((prev) => [
      ...prev,
      {
        id: userLogId,
        query: currentQuery,
        response: '',
        timestamp: new Date().toISOString(),
        feedback: null,
      },
    ]);

    try {
      const aiHeaders = getAiHeaders();
      let data: AiQueryResponse;
      try {
        data = await apiClient.request<AiQueryResponse>('/api/ai/context-query', {
          method: 'POST',
          headers: aiHeaders,
          body: JSON.stringify({
            query: currentQuery,
            mode,
            modules: selectedModules,
          }),
        });
      } catch (contextErr) {
        console.warn('Contextual AI failed, falling back to basic query:', contextErr);
        data = await apiClient.request<AiQueryResponse>('/api/ai/query', {
          method: 'POST',
          headers: aiHeaders,
          body: JSON.stringify({ query: currentQuery, mode }),
        });
      }

      setLogs((prev) =>
        prev.map((log) =>
          log.id === userLogId
            ? {
                ...log,
                id: data.id || log.id,
                response: data.response || 'I could not generate a response. Please try again.',
                timestamp: data.timestamp || new Date().toISOString(),
              }
            : log
        )
      );
    } catch (err) {
      console.error('Failed to get AI response:', err);
      setLogs((prev) => prev.filter((log) => log.id !== userLogId));
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
    <>
      <div className="fixed bottom-6 right-6 z-[200]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer relative overflow-hidden group',
            isOpen
              ? 'bg-slate-900 border border-slate-800 dark:bg-slate-800 dark:border-slate-700'
              : 'bg-gradient-to-tr from-blue-600 via-violet-600 to-indigo-600'
          )}
          aria-label="Toggle AI Assistant"
        >
          {isOpen ? (
            <X size={22} className="relative z-10" />
          ) : (
            <>
              <Bot size={22} className="relative z-10 group-hover:hidden" />
              <Sparkles
                size={22}
                className="relative z-10 hidden group-hover:block animate-pulse text-cyan-200"
              />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-950 animate-pulse" />
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 right-6 z-[200] w-[92vw] md:w-[440px] h-[600px] flex flex-col rounded-[30px] border border-white/70 bg-white/90 shadow-3xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 overflow-hidden"
          >
            <header className="relative shrink-0 overflow-hidden bg-slate-950 p-4 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.4),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.25),transparent_35%)]" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-cyan-200 ring-1 ring-white/20">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-tight">EduConnect AI</h2>
                    <p className="text-[10px] text-slate-300">
                      {aiStatus?.provider === 'gemini'
                        ? 'Powered by Gemini'
                        : aiStatus?.provider === 'openrouter'
                          ? 'Free model assistant'
                          : 'Role-aware assistant'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="relative mt-3 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {modes.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setMode(item.key)}
                    className={cn(
                      'flex items-center gap-1.5 shrink-0 rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all',
                      mode === item.key
                        ? 'bg-white text-slate-950'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    )}
                  >
                    <item.icon size={11} />
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="relative mt-2 flex flex-wrap gap-1 border-t border-white/10 pt-2">
                <span className="flex items-center gap-1 px-1 py-1 text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  <Database size={8} /> Context:
                </span>
                {contextModules.map((mod) => (
                  <button
                    key={mod.key}
                    onClick={() =>
                      setSelectedModules((prev) =>
                        prev.includes(mod.key)
                          ? prev.filter((k) => k !== mod.key)
                          : [...prev, mod.key]
                      )
                    }
                    className={cn(
                      'flex items-center gap-1 rounded-lg px-2 py-0.5 text-[8px] font-black transition-all ring-1',
                      selectedModules.includes(mod.key)
                        ? 'bg-cyan-500/20 text-cyan-200 ring-cyan-500/50'
                        : 'bg-white/5 text-slate-400 ring-white/10 hover:bg-white/10'
                    )}
                  >
                    {selectedModules.includes(mod.key) && <CheckCircle2 size={8} />}
                    {mod.label}
                  </button>
                ))}
              </div>
            </header>

            {showOfflineWarning && isStaffOrAdmin && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 shrink-0">
                <AlertCircle className="text-amber-600" size={14} />
                <p className="text-[10px] font-semibold text-amber-800">
                  AI running in offline fallback mode.
                </p>
              </div>
            )}

            <main className="flex-1 overflow-y-auto bg-slate-50/70 p-4 dark:bg-slate-900/40 space-y-4">
              {logs.length === 0 ? (
                <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center dark:bg-slate-950 dark:border-slate-800">
                  <Sparkles className="mx-auto mb-2 text-blue-600" size={24} />
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">
                    Need help? Start a prompt
                  </h3>
                  <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    &ldquo;{suggested}&rdquo;
                  </p>
                  <button
                    onClick={() => setQuery(suggested)}
                    className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-[11px] font-black text-white transition-all cursor-pointer"
                  >
                    Use Prompt
                  </button>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="space-y-2.5">
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-[20px] bg-blue-600 px-4 py-2.5 text-xs font-semibold leading-relaxed text-white shadow-md">
                        {log.query}
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[88%] rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 shadow-sm">
                        {log.response ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{log.response}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 font-bold">
                            <Loader2 className="animate-spin text-blue-600" size={12} />
                            Thinking...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </main>

            {error && (
              <div className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-[10px] font-semibold text-amber-800 shrink-0 flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => void sendQuery(undefined, query)}
                  className="flex items-center gap-1 font-black text-amber-950 shrink-0 ml-2"
                >
                  <RefreshCcw size={10} />
                  Retry
                </button>
              </div>
            )}

            <form
              onSubmit={sendQuery}
              className="border-t border-slate-200/80 bg-white p-3 shrink-0 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:ring-2 focus-within:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 focus-within:dark:ring-slate-800">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`Ask as ${role || 'student'}...`}
                  className="flex-1 bg-transparent px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
