import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, TrendingUp, Award, Brain, 
  Upload, Search, Filter, Download, 
  ChevronRight, Sparkles, Target, AlertCircle,
  FileText, Users, GraduationCap, ArrowUpRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';

interface PerformanceRecord {
  id: string;
  subject: string;
  term: string;
  score: number;
  grade: string;
  uploadedAt: any;
}

export const PerformancePage = () => {
  const { user, isStudent, canManagePerformance, classId: userClassId } = useAuth();
  
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [report, setReport] = useState<any>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'individual' | 'analytics' | 'management'>(
    isStudent ? 'individual' : 'analytics'
  );

  // Management State
  const [selectedClass, setSelectedClass] = useState(userClassId || '10A');
  const [uploadText, setUploadText] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => {
    if (isStudent) {
      loadStudentPerformance();
    } else {
      loadClassReport();
    }
  }, [user?.uid, selectedClass]);

  const loadStudentPerformance = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/performance/${user?.uid}`, {
        cacheTTL: 5 * 60 * 1000 // 5 minutes cache
      });
      setRecords(data);
      
      // Generate AI suggestions
      if (data.length > 0) {
        const ai = await apiFetch('/api/performance/ai-suggestions', {
          method: 'POST',
          body: JSON.stringify({ studentId: user?.uid, records: data })
        });
        setAiSuggestions(ai.suggestions);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadClassReport = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/performance/report/${selectedClass}`);
      setReport(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // studentId, subject, term, score, grade
      const lines = uploadText.split('\n').filter(l => l.trim() !== '');
      const batchRecords = lines.map(line => {
        const [studentId, subject, term, score, grade] = line.split(',').map(s => s.trim());
        return { studentId, subject, term, score: parseFloat(score), grade, classId: selectedClass };
      });

      await apiFetch('/api/performance/upload', {
        method: 'POST',
        body: JSON.stringify({ records: batchRecords })
      });
      setIsUploadOpen(false);
      setUploadText('');
      loadClassReport();
    } catch (error) {
      alert('Upload failed');
    }
  };

  // Chart Data Preparation
  const chartData = records.map(r => ({
    name: r.subject,
    score: r.score,
    fullMark: 100
  })).reverse();

  const avgScore = records.length > 0 
    ? Math.round(records.reduce((sum, r) => sum + r.score, 0) / records.length) 
    : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <BarChart3 size={32} />
           </div>
           <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Performance Analytics</h1>
              <p className="text-slate-500 font-medium">
                {isStudent ? 'Visualize your academic growth and AI study tips.' : 'Track class performance and subject trends.'}
              </p>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
          {!isStudent && (
             <div className="flex bg-slate-100 p-1.5 rounded-2xl mr-2">
                <button onClick={() => setView('analytics')} className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", view === 'analytics' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}>Charts</button>
                <button onClick={() => setView('management')} className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", view === 'management' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}>Records</button>
             </div>
          )}
          {canManagePerformance && (
            <button 
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95"
            >
              <Upload size={18} />
              Import Scores
            </button>
          )}
        </div>
      </div>

      {isStudent ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Individual Charts */}
           <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Average Score</p>
                    <div className="flex items-baseline gap-2">
                       <h3 className="text-4xl font-black text-slate-900">{avgScore}%</h3>
                       <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5"><TrendingUp size={12}/> +2.4%</span>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Subject</p>
                    <h3 className="text-4xl font-black text-indigo-600">{records[0]?.subject || 'N/A'}</h3>
                 </div>
                 <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Rank</p>
                    <h3 className="text-4xl font-black text-slate-900">#14</h3>
                 </div>
              </div>

              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                       <TrendingUp className="text-indigo-600" />
                       Growth Trend
                    </h3>
                    <select className="bg-slate-50 border-none px-4 py-2 rounded-xl text-xs font-bold text-slate-500 outline-none">
                       <option>All Terms</option>
                       <option>Term 1</option>
                    </select>
                 </div>
                 <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={chartData}>
                          <defs>
                             <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} domain={[0, 100]} />
                          <Tooltip 
                             contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                          />
                          <Area type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>

           {/* AI Study Tips Sidebar */}
           <div className="space-y-6">
              <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                 <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                          <Brain size={20} />
                       </div>
                       <h4 className="font-bold text-lg">Gemini Study Coach</h4>
                    </div>
                    
                    <div className="space-y-4">
                       {aiSuggestions.map((s, i) => (
                         <motion.div 
                           initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                           transition={{ delay: i * 0.1 }}
                           key={i} className="flex gap-3 items-start"
                         >
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 mt-2 shrink-0" />
                            <p className="text-sm font-medium text-indigo-50 leading-relaxed">{s}</p>
                         </motion.div>
                       ))}
                       {aiSuggestions.length === 0 && <p className="text-sm text-indigo-200 italic">Analyzing your scores to generate study tips...</p>}
                    </div>

                    <button className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                       Personalized Plan <Sparkles size={16} />
                    </button>
                 </div>
                 <Sparkles className="absolute -top-4 -right-4 w-32 h-32 text-white opacity-10" />
              </div>

              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                 <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Award size={18} className="text-amber-500" />
                    Achievements
                 </h4>
                 <div className="space-y-4">
                    <div className="flex items-center gap-4 group cursor-pointer">
                       <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                          <Target size={24} />
                       </div>
                       <div>
                          <p className="font-bold text-sm text-slate-800">Perfect Attendance</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Term 1 Badge</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           {/* Staff Analytics View */}
           <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                 <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Users size={14} />
                       Select Class
                    </label>
                    <select 
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl outline-none font-bold text-slate-700"
                    >
                       <option value="10A">Class 10A</option>
                       <option value="10B">Class 10B</option>
                       <option value="9A">Class 9A</option>
                    </select>
                 </div>
              </div>

              {report && (
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                   <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <Target size={18} className="text-indigo-600" />
                      Intervention Alerts
                   </h4>
                   <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-red-50 border border-red-100">
                         <p className="text-xs font-bold text-red-700 mb-1">Low Performance</p>
                         <p className="text-[10px] text-red-600 font-medium">4 students scored below 40% in Math.</p>
                      </div>
                      <button className="w-full text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center justify-center gap-1 hover:underline">
                         View Details <ChevronRight size={14} />
                      </button>
                   </div>
                </div>
              )}
           </div>

           <div className="lg:col-span-3">
              {view === 'analytics' ? (
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm h-[500px]">
                   <h3 className="font-bold text-xl text-slate-900 mb-10">Subject Average (Class {selectedClass})</h3>
                   <ResponsiveContainer width="100%" height="80%">
                      <BarChart data={report?.analytics || []}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                         <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} domain={[0, 100]} />
                         <Tooltip cursor={{fill: '#f8fafc'}} />
                         <Bar dataKey="average" radius={[10, 10, 0, 0]} barSize={50}>
                            {report?.analytics?.map((_: any, index: number) => (
                               <Cell key={index} fill={index % 2 === 0 ? '#4f46e5' : '#818cf8'} />
                            ))}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
              ) : (
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                   <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="text-xl font-bold text-slate-900">Performance Ledger</h3>
                      <div className="flex gap-2">
                        <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm"><Search size={18}/></button>
                        <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm"><Download size={18}/></button>
                      </div>
                   </div>
                   <div className="overflow-x-auto">
                      <table className="w-full text-left">
                         <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                               <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                               <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</th>
                               <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Score</th>
                               <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Grade</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                            {loading ? (
                               <tr><td colSpan={4} className="p-20 text-center text-slate-400">Loading performance data...</td></tr>
                            ) : report?.totalRecords === 0 ? (
                               <tr><td colSpan={4} className="p-20 text-center text-slate-400">No records found.</td></tr>
                            ) : report?.records?.map((r: any, i: number) => (
                               <tr key={i} className="hover:bg-indigo-50/30 transition-colors group">
                                  <td className="px-8 py-5">
                                     <p className="font-bold text-slate-700">{r.studentId}</p>
                                     <p className="text-[10px] text-slate-400 font-bold uppercase">{r.term}</p>
                                  </td>
                                  <td className="px-8 py-5 font-medium text-slate-600">{r.subject}</td>
                                  <td className="px-8 py-5 text-center font-black text-slate-900">{r.score}%</td>
                                  <td className="px-8 py-5 text-center">
                                     <span className={cn(
                                       "inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm",
                                       r.score >= 80 ? "bg-emerald-50 text-emerald-600" : 
                                       r.score >= 60 ? "bg-indigo-50 text-indigo-600" : "bg-red-50 text-red-600"
                                     )}>
                                        {r.grade}
                                     </span>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[100]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsUploadOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden p-12 space-y-8"
            >
               <div className="space-y-2">
                 <h3 className="text-3xl font-black text-slate-900">Batch Score Import</h3>
                 <p className="text-slate-500 font-medium">Uploading data for <span className="text-indigo-600 font-bold">Class {selectedClass}</span>.</p>
               </div>
               
               <form onSubmit={handleUpload} className="space-y-6">
                  <div className="space-y-3">
                     <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={14} />
                        Data Entry (CSV Format)
                     </label>
                     <textarea 
                        required rows={8}
                        value={uploadText}
                        onChange={(e) => setUploadText(e.target.value)}
                        placeholder="studentId, subject, term, score, grade&#10;user_uid_1, Mathematics, Term 1, 85, A&#10;user_uid_2, Science, Term 1, 72, B"
                        className="w-full bg-slate-50 border border-slate-200 p-6 rounded-[32px] outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-mono text-xs leading-relaxed" 
                     />
                     <div className="bg-indigo-50 p-4 rounded-2xl flex gap-3 items-center">
                        <AlertCircle size={18} className="text-indigo-600" />
                        <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">Format: UID, Subject, Term, Score, Grade (one per line)</p>
                     </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                     <button type="submit" className="flex-1 bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Import Records</button>
                     <button type="button" onClick={() => setIsUploadOpen(false)} className="px-8 bg-slate-100 text-slate-500 py-5 rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-slate-200 transition-all">Cancel</button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
