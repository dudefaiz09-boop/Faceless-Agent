import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Bot, User as UserIcon, MessageSquare, 
  ThumbsUp, ThumbsDown, Sparkles, Clock, 
  RotateCcw, Trash2, AlertCircle, ChevronRight, MoreVertical
} from 'lucide-react';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

interface ChatLog {
  id: string;
  query: string;
  response: string;
  timestamp: any;
  feedback: 'helpful' | 'not_helpful' | null;
}

export const ChatbotPage = () => {
  const { user, role } = useAuth();
  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, [user?.uid]);

  const loadHistory = async () => {
    try {
      const data = await apiFetch(`/api/chatbot/history/${user?.uid}`);
      setLogs(data.reverse()); // Reverse to show oldest first in the scroll area
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const currentQuery = query;
    setQuery('');
    setLoading(true);

    try {
      const data = await apiFetch('/api/chatbot/query', {
        method: 'POST',
        body: JSON.stringify({ query: currentQuery })
      });
      
      const newLog: ChatLog = {
        id: data.id,
        query: currentQuery,
        response: data.response,
        timestamp: data.timestamp,
        feedback: null
      };

      setLogs(prev => [...prev, newLog]);
    } catch (error) {
      alert('AI assistant is currently unavailable. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (logId: string, feedback: 'helpful' | 'not_helpful') => {
    try {
      await apiFetch('/api/chatbot/feedback', {
        method: 'POST',
        body: JSON.stringify({ logId, feedback })
      });
      setLogs(prev => prev.map(log => log.id === logId ? { ...log, feedback } : log));
    } catch (error) {
      console.error('Failed to save feedback:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, loading]);

  const getRolePrompt = () => {
    switch (role) {
      case 'student': return "Ask about homework, assignments, or study tips...";
      case 'teacher': return "Ask about class management, grading, or lesson plans...";
      case 'admin':
      case 'principal': return "Ask about analytics, reports, or school coordination...";
      default: return "How can I help you today?";
    }
  };

  const suggestedQueries = {
    student: ["Explain algebra basics", "When is my next assignment?", "How to improve my grades?"],
    teacher: ["Tips for classroom management", "Create a grading rubric", "Summarize student performance"],
    admin: ["View fee collection report", "Check staff attendance", "Generate performance summary"],
    principal: ["Overall school performance", "Analyze fee trends", "Staff coordination report"],
    parent: ["Check my child's attendance", "Next parent-teacher meeting", "View latest grades"]
  }[role || 'student'] || [];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100 ring-4 ring-blue-50">
             <Bot size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 leading-tight">AI Assistant</h3>
            <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={10} />
              Tailored for {role}s
            </p>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={loadHistory} className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"><RotateCcw size={20}/></button>
           <button className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"><MoreVertical size={20}/></button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/30">
        {historyLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
             <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
             <p className="text-xs font-bold uppercase tracking-widest">Loading Conversation...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto gap-8">
             <div className="space-y-4">
               <div className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center text-blue-600 shadow-sm mx-auto">
                 <Bot size={40} />
               </div>
               <div className="space-y-2">
                 <h4 className="text-2xl font-bold text-slate-900">Hello, {user?.displayName?.split(' ')[0]}!</h4>
                 <p className="text-slate-500 text-sm">I'm your EduConnect AI. I'm here to help you manage your {role} tasks efficiently.</p>
               </div>
             </div>

             <div className="w-full space-y-3">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Try asking</p>
               <div className="grid gap-2">
                 {suggestedQueries.map((q, i) => (
                   <button 
                     key={i}
                     onClick={() => setQuery(q)}
                     className="bg-white p-4 rounded-2xl border border-slate-100 text-sm font-bold text-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all text-left flex items-center justify-between group"
                   >
                     {q}
                     <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-all" />
                   </button>
                 ))}
               </div>
             </div>
          </div>
        ) : (
          <>
            {logs.map((log) => (
              <div key={log.id} className="space-y-6">
                {/* User Message */}
                <div className="flex flex-col items-end">
                   <div className="bg-white text-slate-800 px-6 py-4 rounded-3xl rounded-tr-none shadow-sm border border-slate-100 max-w-[85%] text-sm font-bold">
                     {log.query}
                   </div>
                </div>

                {/* Bot Response */}
                <div className="flex gap-4 max-w-[90%]">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-100 mt-1">
                    <Bot size={18} />
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white text-slate-700 px-6 py-5 rounded-3xl rounded-tl-none shadow-sm border border-slate-100 text-sm leading-relaxed prose prose-sm max-w-none">
                      <ReactMarkdown>{log.response}</ReactMarkdown>
                    </div>
                    
                    {/* Feedback & Tools */}
                    <div className="flex items-center gap-4 px-2">
                       <span className="text-[9px] font-bold text-slate-400 uppercase">AI Generated • {new Date(log.timestamp?.toDate?.() || log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       <div className="flex items-center gap-1 ml-auto">
                          <button 
                            onClick={() => handleFeedback(log.id, 'helpful')}
                            className={cn(
                              "p-1.5 rounded-lg transition-all",
                              log.feedback === 'helpful' ? "bg-emerald-50 text-emerald-600" : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                            )}
                          >
                            <ThumbsUp size={14} />
                          </button>
                          <button 
                            onClick={() => handleFeedback(log.id, 'not_helpful')}
                            className={cn(
                              "p-1.5 rounded-lg transition-all",
                              log.feedback === 'not_helpful' ? "bg-red-50 text-red-600" : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                            )}
                          >
                            <ThumbsDown size={14} />
                          </button>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 max-w-[90%]"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-100 mt-1">
                  <Bot size={18} />
                </div>
                <div className="bg-white px-6 py-5 rounded-3xl rounded-tl-none shadow-sm border border-slate-100 flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={handleQuery} className="flex items-center gap-4 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={getRolePrompt()}
              disabled={loading}
              className="w-full bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm font-bold disabled:opacity-50"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
               <button type="button" className="p-1.5 text-slate-300 hover:text-blue-600 transition-colors">
                 <Sparkles size={18} />
               </button>
            </div>
          </div>
          <button 
            type="submit"
            disabled={!query.trim() || loading}
            className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:scale-95 active:scale-90"
          >
            <Send size={20} />
          </button>
        </form>
        <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest mt-4">
          EduConnect AI can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
};
