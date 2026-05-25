import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api-client';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  Award,
  Brain,
  Upload,
  Download,
  ChevronRight,
  Sparkles,
  Target,
  AlertCircle,
  FileText,
  Users,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { validatePerformanceCSV, CSVValidationError } from '../lib/csvValidator';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { DataTable, type DataTableColumn } from '../components/saas/DataTable';
import { SearchBar } from '../components/saas/SearchBar';
import { PageHeader } from '../components/ui/PageHeader';
import { PageShell } from '../components/ui/PageShell';
import { useToast } from '../components/saas/ToastProvider';

interface PerformanceRecord {
  id: string;
  subject: string;
  term: string;
  score: number;
  grade: string;
  studentId: string;
}

interface PerformanceReport {
  classAverage: number;
  topSubject: string;
  globalRank: number;
  records: PerformanceRecord[];
}

export const PerformancePage = () => {
  const { user, isStudent, canManagePerformance, classId: userClassId } = useAuth();
  const { toast } = useToast();
  const [classOptions] = React.useState<Array<{ id: string; label: string; section: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'analytics' | 'management'>(
    canManagePerformance ? 'management' : 'analytics'
  );

  // Import State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [selectedClass, setSelectedClass] = useState(userClassId || '');
  const [scoreSearch, setScoreSearch] = useState('');
  const [uploadError, setUploadError] = useState<CSVValidationError[] | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (classOptions.length > 0 && !classOptions.some((option) => option.id === selectedClass)) {
      queueMicrotask(() => setSelectedClass(userClassId || classOptions[0]?.id || ''));
    }
  }, [classOptions, selectedClass, userClassId]);

  const loadStudentData = useCallback(async () => {
    try {
      const data = await apiClient.request<PerformanceRecord[]>(`/api/performance/${user?.uid}`);
      setRecords(data);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadClassReport = useCallback(async () => {
    try {
      const data = await apiClient.request<PerformanceReport>(
        `/api/performance/report/${selectedClass}`
      );
      setReport(data);
      if (view === 'management') setRecords(data.records);
    } catch (error) {
      console.error('Failed to load class report:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, view]);

  useEffect(() => {
    if (isStudent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadStudentData();
    } else {
      loadClassReport();
    }
  }, [isStudent, loadStudentData, loadClassReport]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(false);
    setLoading(true);

    const validation = validatePerformanceCSV(uploadText);
    if (!validation.isValid) {
      setUploadError(validation.errors || []);
      setLoading(false);
      return;
    }

    try {
      const batchRecords = validation.records!.map((r) => ({
        ...r,
        classId: selectedClass,
      }));

      await apiClient.request('/api/performance/upload', {
        method: 'POST',
        body: JSON.stringify({ records: batchRecords }),
      });

      setUploadSuccess(true);
      toast({
        tone: 'success',
        title: 'Scores imported',
        description: `${batchRecords.length} performance records were uploaded for ${selectedClass}.`,
      });
      setTimeout(() => {
        setIsUploadOpen(false);
        setUploadText('');
        setUploadSuccess(false);
        setLoading(true);
        loadClassReport();
      }, 2000);
    } catch (error) {
      console.error('Performance upload failed:', error);
      toast({
        tone: 'error',
        title: 'Score import failed',
        description: error instanceof Error ? error.message : 'Upload failed. Please try again.',
      });
      setUploadError([
        {
          line: 0,
          message: error instanceof Error ? error.message : 'Upload failed. Please try again.',
          value: '',
        },
      ]);
      setLoading(false);
    }
  };

  const handleClassChange = (newClass: string) => {
    setSelectedClass(newClass);
    setLoading(true);
  };

  const readCsvFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploadText(String(reader.result || ''));
    reader.readAsText(file);
  };

  const downloadPerformanceSample = () => {
    const sample =
      'studentId,subject,term,score,grade,class\nstudent001,Mathematics,Term 1,85,A,10A\nstudent002,Science,Term 1,72,B,10B';
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'educonnect-performance-sample.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleViewChange = (newView: 'analytics' | 'management') => {
    setView(newView);
    setLoading(true);
  };

  // Chart Data Preparation
  const chartData = records
    .map((r) => ({
      name: r.subject,
      score: r.score,
      fullMark: 100,
    }))
    .reverse();

  const avgScore =
    records.length > 0
      ? Math.round(records.reduce((sum, r) => sum + r.score, 0) / records.length)
      : 0;

  const globalRank = report?.globalRank || 0;
  const filteredRecords = records.filter(
    (record) => {
      const query = scoreSearch.trim().toLowerCase();
      if (!query) return true;
      return (
        record.studentId.toLowerCase().includes(query) ||
        record.subject.toLowerCase().includes(query) ||
        record.term.toLowerCase().includes(query) ||
        record.grade.toLowerCase().includes(query)
      );
    },
    [records, scoreSearch]
  );

  const exportPerformanceCsv = () => {
    if (filteredRecords.length === 0) {
      toast({
        tone: 'warning',
        title: 'No records',
        description: 'There are no score rows to export.',
      });
      return;
    }
    const csv = [
      'studentId,subject,term,score,grade,class',
      ...filteredRecords.map((record) =>
        [
          record.studentId,
          record.subject,
          record.term,
          record.score,
          record.grade,
          selectedClass,
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `performance-${selectedClass}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const scoreColumns: Array<DataTableColumn<PerformanceRecord>> = [
    {
      key: 'studentId',
      header: 'UID',
      render: (record) => (
        <span className="font-bold text-slate-700 dark:text-slate-200">{record.studentId}</span>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (record) => (
        <span className="font-semibold text-slate-600 dark:text-slate-300">{record.subject}</span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      align: 'center',
      render: (record) => (
        <span className="font-black text-slate-900 dark:text-white">{record.score}%</span>
      ),
    },
    {
      key: 'grade',
      header: 'Grade',
      align: 'center',
      render: (record) => (
        <span
          className={cn(
            'text-[10px] font-black uppercase px-3 py-1 rounded-full',
            record.score >= 80
              ? 'bg-emerald-50 text-emerald-600'
              : record.score >= 60
                ? 'bg-amber-50 text-amber-600'
                : 'bg-red-50 text-red-600'
          )}
        >
          {record.grade}
        </span>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Performance Analytics"
        description={
          isStudent
            ? 'Visualize your academic growth and AI study tips.'
            : 'Track class performance and subject trends.'
        }
      >
        <div className="flex items-center gap-3">
          {!isStudent && (
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mr-2 dark:bg-slate-900">
              <button
                onClick={() => handleViewChange('analytics')}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-bold transition-all',
                  view === 'analytics'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                    : 'text-slate-500'
                )}
              >
                Analytics
              </button>

              <button
                onClick={() => handleViewChange('management')}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-bold transition-all',
                  view === 'management'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                    : 'text-slate-500'
                )}
              >
                Management
              </button>
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
      </PageHeader>

      {isStudent ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Individual Charts */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Average Score
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-4xl font-black text-slate-900">{avgScore}%</h3>
                  <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5">
                    <TrendingUp size={12} /> +2.4%
                  </span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Top Subject
                </p>
                <h3 className="text-4xl font-black text-indigo-600">
                  {records[0]?.subject || 'N/A'}
                </h3>
              </div>
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Global Rank
                </p>
                <h3 className="text-4xl font-black text-slate-900">#{globalRank}</h3>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="text-indigo-600" size={20} />
                  Academic Progress
                </h3>
              </div>
              <div className="h-[300px] min-h-[300px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '16px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#4f46e5"
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#colorScore)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AI Insights Sidebar */}
          <div className="space-y-6">
            <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                    <Brain className="text-indigo-400" size={20} />
                  </div>
                  <h3 className="text-lg font-bold">AI Study Plan</h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">
                      Focus Area
                    </p>
                    <p className="text-sm font-medium">Advanced Calculus & Integration</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">
                      Suggested Goal
                    </p>
                    <p className="text-sm font-medium">Increase Chemistry score by 15%</p>
                  </div>
                </div>
                <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/20">
                  Generate New Plan
                </button>
              </div>
              <Sparkles className="absolute -bottom-8 -right-8 w-40 h-40 text-indigo-500 opacity-20 rotate-12" />
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Target size={20} className="text-indigo-600" />
                Upcoming Milestones
              </h3>
              <div className="space-y-4">
                {[
                  { title: 'Final Exams', date: 'June 15', icon: Award },
                  { title: 'Math Olympiad', date: 'May 28', icon: Sparkles },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-4 group cursor-pointer">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                      <m.icon size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                        {m.title}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">{m.date}</p>
                    </div>
                    <ChevronRight size={16} className="ml-auto text-slate-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Staff Filters */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Users size={14} />
                  Select Class
                </label>
                <select
                  aria-label="Filter performance records by class"
                  value={selectedClass}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl outline-none font-bold text-slate-700"
                >
                  {classOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-4 border-t border-slate-50 space-y-2">
                <button
                  onClick={exportPerformanceCsv}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-600">
                    Export Statistics
                  </span>
                  <Download size={16} className="text-slate-500" />
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                  <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-600">
                    View Reports
                  </span>
                  <FileText size={16} className="text-slate-500" />
                </button>
              </div>
            </div>

            {report && (
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-600" />
                  Class Insights
                </h4>
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">
                      Class Average
                    </p>
                    <p className="text-xl font-black text-slate-900">{report.classAverage}%</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">
                      Top Subject
                    </p>
                    <p className="text-xl font-black text-indigo-700">{report.topSubject}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Staff Main View */}
          <div className="lg:col-span-3 space-y-8">
            {view === 'management' ? (
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Student Scores</h3>
                  <div className="w-full sm:w-72">
                    <SearchBar
                      value={scoreSearch}
                      onChange={setScoreSearch}
                      placeholder="Search scores..."
                    />
                  </div>
                </div>
                {loading ? (
                  <div className="p-20 text-center text-slate-500">Loading scores...</div>
                ) : (
                  <DataTable
                    columns={scoreColumns}
                    rows={filteredRecords}
                    getRowKey={(record) => record.id}
                    emptyMessage="No score records match this class or search."
                  />
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm h-[400px] min-h-[400px] w-full min-w-0">
                  <h4 className="font-bold text-slate-900 mb-8 flex items-center gap-2">
                    <Target size={20} className="text-indigo-600" />
                    Subject Wise Averages
                  </h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                      />
                      <Tooltip cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.score >= 80 ? '#4f46e5' : '#818cf8'}
                            fillOpacity={0.8}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
                  <h4 className="font-bold text-slate-900">Performance Distribution</h4>
                  <div className="space-y-6">
                    {[
                      { label: 'Exceeding Expectations (A/B)', count: 12, color: 'bg-emerald-500' },
                      { label: 'Meeting Expectations (C)', count: 18, color: 'bg-amber-500' },
                      { label: 'Needs Support (D/F)', count: 4, color: 'bg-red-500' },
                    ].map((item, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-slate-600">{item.label}</span>
                          <span className="text-slate-900">{item.count} Students</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full transition-all', item.color)}
                            style={{ width: `${(item.count / 34) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUploadOpen(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden p-12 space-y-8 dark:bg-slate-900 dark:border dark:border-slate-800 dark:text-slate-50"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                    Batch Score Import
                  </h3>
                  <p className="text-slate-500 font-medium">
                    Uploading data for{' '}
                    <span className="text-indigo-600 font-bold">Class {selectedClass}</span>.
                  </p>
                </div>
                <button
                  onClick={() => setIsUploadOpen(false)}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              {uploadSuccess ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl">✓</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-emerald-600">Upload Successful!</h4>
                    <p className="text-sm text-slate-500 mt-1">
                      Performance records have been imported.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpload} className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={14} />
                      Data Entry (CSV Format)
                    </label>
                    <textarea
                      aria-label="Paste performance CSV records"
                      required
                      rows={8}
                      value={uploadText}
                      onChange={(e) => setUploadText(e.target.value)}
                      placeholder="studentId, subject, term, score, grade&#10;student001, Mathematics, Term 1, 85, A&#10;student002, Science, Term 1, 72, B"
                      className="w-full bg-slate-50 border border-slate-200 p-6 rounded-[32px] text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-mono text-xs leading-relaxed dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <input
                      aria-label="Choose performance CSV file"
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(event) => readCsvFile(event.target.files?.[0])}
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-indigo-700 hover:bg-indigo-100"
                      >
                        Choose CSV File
                      </button>
                      <button
                        type="button"
                        onClick={downloadPerformanceSample}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50"
                      >
                        Download Sample CSV
                      </button>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-2xl flex gap-3 items-center">
                      <AlertCircle size={18} className="text-indigo-600" />
                      <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">
                        Format: UID, Subject, Term, Score, Grade (one per line)
                      </p>
                    </div>
                  </div>

                  {uploadError && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
                      <p className="text-sm font-bold text-red-700">Validation Errors:</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {uploadError.map((err, i) => (
                          <p key={i} className="text-xs text-red-600">
                            <span className="font-bold">Line {err.line}:</span> {err.message}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {loading ? 'Uploading...' : 'Upload'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsUploadOpen(false)}
                      disabled={loading}
                      className="px-8 bg-slate-100 text-slate-600 py-5 rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-slate-200 transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};
