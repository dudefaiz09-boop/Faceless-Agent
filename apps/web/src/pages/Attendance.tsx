import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api-client';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar as CalendarIcon,
  Users,
  BarChart3,
  Save,
  CheckSquare,
  Download,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { useDebounce } from '../lib/hooks';
import { getActiveTenantId, getDefaultClassId, getDemoClassesForTenant } from '../lib/tenant';
import { AttendanceRecord, StudentProfile as Student } from '@educonnect/shared';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { PageShell } from '../components/ui/PageShell';
import { useDocuments } from '../lib/documents';
import { SearchBar } from '../components/saas/SearchBar';
import { StatCard } from '../components/saas/StatCard';
import { useToast } from '../components/saas/ToastProvider';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

type StudentDocument = Student & {
  role?: string;
  roles?: string[];
  schoolId?: string;
  tenantId?: string;
};

type AttendanceStatus = 'present' | 'absent' | 'late';

type AttendanceReportEntry = {
  date: string;
  attendanceRate: number;
};

const statusOptions = [
  {
    id: 'present',
    icon: CheckCircle2,
    label: 'Present',
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100',
  },
  {
    id: 'absent',
    icon: XCircle,
    label: 'Absent',
    activeClass: 'bg-red-600 text-white border-red-600 shadow-md shadow-red-100',
  },
  {
    id: 'late',
    icon: Clock,
    label: 'Late',
    activeClass: 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-100',
  },
] as const;

function exportCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const headers = Object.keys(rows[0] || {});
  if (!headers.length) return;

  const escapeCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const AttendancePage = () => {
  const { user, canManageAttendance, classId: userClassId, schoolId } = useAuth();
  const { toast } = useToast();
  const activeTenantId = getActiveTenantId(schoolId);
  const classOptions = React.useMemo(
    () => getDemoClassesForTenant(activeTenantId),
    [activeTenantId]
  );

  const [view, setView] = useState<'marking' | 'history' | 'reports'>(
    canManageAttendance ? 'marking' : 'history'
  );

  // Shared state
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState(userClassId || getDefaultClassId(schoolId));
  const [loading, setLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Marking state
  const [dailyRecords, setDailyRecords] = useState<Record<string, 'present' | 'absent' | 'late'>>(
    {}
  );
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [saving, setSaving] = useState(false);

  // History state
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [reportData, setReportData] = useState<AttendanceReportEntry[]>([]);

  const { data: userDocuments, loading: studentsLoading } = useDocuments<StudentDocument>('users', {
    enabled: !!schoolId,
  });

  const students = React.useMemo(() => {
    return userDocuments.filter((student) => {
      const studentSchoolId = student.schoolId || student.tenantId;
      const isStudent = student.role === 'student' || student.roles?.includes('student');
      const studentClassIds = student.classIds || (student.classId ? [student.classId] : []);
      const matchesClass = studentClassIds.includes(selectedClass);
      const matchesSchool = !activeTenantId || studentSchoolId === activeTenantId;
      return isStudent && matchesClass && matchesSchool;
    });
  }, [userDocuments, selectedClass, activeTenantId]);

  useEffect(() => {
    if (!classOptions.some((option) => option.id === selectedClass)) {
      queueMicrotask(() =>
        setSelectedClass(userClassId || classOptions[0]?.id || getDefaultClassId(activeTenantId))
      );
    }
  }, [activeTenantId, classOptions, selectedClass, userClassId]);

  const loadMarkingData = useCallback(async () => {
    setLoading(true);
    try {
      // Students are now handled by realtime sync in the background
      // Fetching records manually for now as they are keyed by date_class
      const records = await apiClient.request<AttendanceRecord[]>(
        `/api/attendance?classId=${selectedClass}&date=${selectedDate}`
      );
      const recordMap: Record<string, 'present' | 'absent' | 'late'> = {};
      records.forEach((r: AttendanceRecord) => {
        recordMap[r.studentId] = r.status;
      });
      setDailyRecords(recordMap);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedDate]);

  const loadHistory = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await apiClient.request<AttendanceRecord[]>(
        `/api/attendance/history/${user?.uid}`,
        {}
      );
      setHistory(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.request<AttendanceReportEntry[]>(
        `/api/attendance/report/${selectedClass}`,
        {}
      );
      setReportData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    const fetchData = async () => {
      if (view === 'marking' && canManageAttendance) {
        await loadMarkingData();
      } else if (view === 'history') {
        await loadHistory();
      } else if (view === 'reports' && canManageAttendance) {
        await loadReports();
      }
    };
    fetchData();
  }, [view, canManageAttendance, loadHistory, loadMarkingData, loadReports]);

  const handleMark = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setDailyRecords((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAllPresent = () => {
    const newRecords = { ...dailyRecords };
    students.forEach((s) => {
      const studentId = s.uid || s.id;
      if (studentId && !newRecords[studentId]) newRecords[studentId] = 'present';
    });
    setDailyRecords(newRecords);
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const records = students.map((s) => ({
        studentId: s.uid || s.id,
        studentName: s.displayName,
        status: dailyRecords[s.uid || s.id] || 'absent',
      }));

      await apiClient.request('/api/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({
          classId: selectedClass,
          date: selectedDate,
          records,
        }),
      });
      // Refetch to ensure sync
      await loadMarkingData();
      setLastSyncTime(new Date());
      toast({
        tone: 'success',
        title: 'Attendance saved',
        description: `${records.length} records saved for ${selectedClass}.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        tone: 'error',
        title: 'Attendance save failed',
        description: 'Please check your API connection and try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = React.useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    return students.filter(
      (s) =>
        (s.displayName || '').toLowerCase().includes(query) ||
        (s.email || '').toLowerCase().includes(query)
    );
  }, [students, debouncedSearch]);

  const dailySummary = React.useMemo(() => {
    return students.reduce(
      (summary, student) => {
        const status = dailyRecords[student.uid || student.id] || 'absent';
        summary[status] += 1;
        return summary;
      },
      { present: 0, absent: 0, late: 0 }
    );
  }, [students, dailyRecords]);

  const exportDailyAttendance = () => {
    exportCsv(
      `attendance-${selectedClass}-${selectedDate}.csv`,
      students.map((student) => ({
        date: selectedDate,
        classId: selectedClass,
        studentId: student.uid || student.id,
        studentName: student.displayName || '',
        email: student.email || '',
        status: dailyRecords[student.uid || student.id] || 'absent',
      }))
    );
  };

  const handleRefresh = useCallback(async () => {
    if (view === 'marking' && canManageAttendance) {
      await loadMarkingData();
    } else if (view === 'history') {
      await loadHistory();
    } else if (view === 'reports' && canManageAttendance) {
      await loadReports();
    }
    setLastSyncTime(new Date());
    toast({
      tone: 'success',
      title: 'Refreshed',
      description: 'Attendance data synced successfully.',
    });
  }, [view, canManageAttendance, loadMarkingData, loadHistory, loadReports, toast]);

  return (
    <PageShell maxWidth="max-w-6xl">
      <PageHeader
        title="Attendance"
        description={
          canManageAttendance
            ? 'Track student attendance and review history.'
            : 'View your attendance record.'
        }
      >
        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="rounded-xl bg-white border border-slate-200 p-3 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
            title="Refresh attendance data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            {canManageAttendance && (
              <button
                onClick={() => setView('marking')}
                className={cn(
                  'px-6 py-2 rounded-xl text-sm font-bold transition-all',
                  view === 'marking' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600'
                )}
              >
                Marking
              </button>
            )}
            <button
              onClick={() => setView('history')}
              className={cn(
                'px-6 py-2 rounded-xl text-sm font-bold transition-all',
                view === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600'
              )}
            >
              History
            </button>
            {canManageAttendance && (
              <button
                onClick={() => setView('reports')}
                className={cn(
                  'px-6 py-2 rounded-xl text-sm font-bold transition-all',
                  view === 'reports' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600'
                )}
              >
                Reports
              </button>
            )}
          </div>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-8">
        {view === 'marking' ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                title="Present"
                value={String(dailySummary.present)}
                detail="Marked for selected day"
                icon={CheckCircle2}
                tone="emerald"
              />
              <StatCard
                title="Late"
                value={String(dailySummary.late)}
                detail="Needs follow-up"
                icon={Clock}
                tone="cyan"
              />
              <StatCard
                title="Absent"
                value={String(dailySummary.absent)}
                detail="Auto-filled if unmarked"
                icon={XCircle}
                tone="violet"
              />
            </div>

            {canManageAttendance && (
              <div className="flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                <p className="text-xs font-bold text-emerald-700">
                  Last synced: {formatDistanceToNow(lastSyncTime, { addSuffix: true })}
                </p>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  Realtime enabled
                </span>
              </div>
            )}

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Select Class
                </label>
                <div className="relative">
                  <Users
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 pl-11 pr-4 py-3 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                  >
                    {classOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Date
                </label>
                <div className="relative">
                  <CalendarIcon
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 pl-11 pr-4 py-3 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              <div className="md:col-span-1 lg:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Search Student
                </label>
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder="Filter by name or email..."
                />
              </div>
            </div>

            {/* Marking Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex flex-col gap-3 bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare size={20} className="text-blue-600" />
                  Mark Attendance
                  <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full">
                    {filteredStudents.length} Students
                  </span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={markAllPresent}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl transition-colors"
                  >
                    Mark All Present
                  </button>
                  <button
                    onClick={exportDailyAttendance}
                    disabled={students.length === 0}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-40"
                  >
                    <Download size={14} />
                    Export CSV
                  </button>
                </div>
              </div>

              {loading || studentsLoading ? (
                <div className="p-20 flex justify-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-left bg-slate-50/30">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Student
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredStudents.map((s) => {
                        const studentId = s.uid || s.id;
                        if (!studentId) return null;
                        return (
                          <tr key={studentId} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs">
                                  {(s.displayName || '?')[0]}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 text-sm">
                                    {s.displayName || 'Unnamed Student'}
                                  </p>
                                  <p className="text-xs text-slate-400">{s.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                {statusOptions.map((btn) => (
                                  <button
                                    key={btn.id}
                                    onClick={() =>
                                      handleMark(studentId, btn.id as AttendanceStatus)
                                    }
                                    className={cn(
                                      'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border',
                                      dailyRecords[studentId] === btn.id
                                        ? btn.activeClass
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                    )}
                                  >
                                    <btn.icon size={14} />
                                    {btn.label}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex justify-end">
                <button
                  onClick={saveAttendance}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save size={20} />
                  )}
                  Save Daily Record
                </button>
              </div>
            </div>
          </div>
        ) : view === 'history' ? (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Attendance History</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((record) => (
                <Card key={record.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-bold text-slate-900">
                      {format(new Date(record.date), 'MMMM d, yyyy')}
                    </p>
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-[10px] font-black uppercase',
                        record.status === 'present'
                          ? 'bg-emerald-50 text-emerald-600'
                          : record.status === 'absent'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-amber-50 text-amber-600'
                      )}
                    >
                      {record.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">Class: {selectedClass}</p>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Attendance Trends</h3>
                    <p className="text-sm text-slate-400 mt-1 uppercase font-black tracking-widest">
                      Class {selectedClass} • Last 30 Days
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <BarChart3 size={24} />
                  </div>
                </div>

                <div className="h-[400px] min-h-[400px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                        dy={10}
                        tickFormatter={(str) => format(new Date(str), 'MMM d')}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                        tickFormatter={(val) => `${Math.round(val * 100)}%`}
                      />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{
                          borderRadius: '16px',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        }}
                      />
                      <Bar dataKey="attendanceRate" radius={[6, 6, 0, 0]}>
                        {reportData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.attendanceRate > 0.9 ? '#10b981' : '#f59e0b'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-6">
                <Card className="p-8 bg-blue-600 text-white border-none shadow-xl shadow-blue-100 rounded-[2.5rem]">
                  <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2">
                    Overall Average
                  </p>
                  <h4 className="text-5xl font-black mb-4">94.2%</h4>
                  <p className="text-sm text-blue-100/80 leading-relaxed">
                    Attendance is currently stable for this class compared to the previous month.
                  </p>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
};
