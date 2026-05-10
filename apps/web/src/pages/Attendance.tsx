import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, XCircle, Clock, Search, 
  Calendar as CalendarIcon, Users, BarChart3, 
  Save, CheckSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { useDebounce } from '../lib/hooks';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

interface AttendanceRecord {
  id?: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  classId: string;
}

interface Student {
  uid: string;
  displayName: string;
  email: string;
  classId?: string;
}

export const AttendancePage = () => {
  const { user, isStudent, canManageAttendance, classId: userClassId } = useAuth();
  
  const [view, setView] = useState<'marking' | 'history' | 'reports'>(
    canManageAttendance ? 'marking' : 'history'
  );
  
  // Shared state
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState(userClassId || '10A');
  const [loading, setLoading] = useState(true);
  
  // Marking state
  const [students, setStudents] = useState<Student[]>([]);
  const [dailyRecords, setDailyRecords] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [saving, setSaving] = useState(false);

  // History state
  const [history, setHistory] = useState<AttendanceRecord[]>([]);

  const loadMarkingData = async () => {
    setLoading(true);
    try {
      // 1. Fetch students in the selected class
      const studentQ = query(
        collection(db, 'users'), 
        where('roles', 'array-contains', 'student'),
        where('classId', '==', selectedClass)
      );
      const studentSnap = await getDocs(studentQ);
      const studentList = studentSnap.docs.map(doc => doc.data() as Student);
      setStudents(studentList);

      // 2. Fetch existing records for this date and class
      const records = await apiFetch(`/api/attendance?classId=${selectedClass}&date=${selectedDate}`);
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
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/attendance/history/${user?.uid}`, {
        cacheTTL: 5 * 60 * 1000 // 5 minutes cache for history
      });
      setHistory(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      await apiFetch(`/api/attendance/report/${selectedClass}`, {
        cacheTTL: 60 * 1000 // 1 minute cache for reports
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
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
    setDailyRecords(prev => ({ ...prev, [studentId]: status }));
  };

  const markAllPresent = () => {
    const newRecords = { ...dailyRecords };
    students.forEach(s => {
      if (!newRecords[s.uid]) newRecords[s.uid] = 'present';
    });
    setDailyRecords(newRecords);
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const recordsToSave = Object.entries(dailyRecords).map(([studentId, status]) => ({
        studentId,
        status
      }));
      await apiFetch('/api/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({
          classId: selectedClass,
          date: selectedDate,
          records: recordsToSave
        })
      });
      alert('Attendance saved successfully!');
    } catch (error) {
      alert('Failed to save attendance: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.displayName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(debouncedSearch.toLowerCase())
  );
  const stats = [
    { name: 'Present', value: Object.values(dailyRecords).filter(v => v === 'present').length, color: '#10b981' },
    { name: 'Absent', value: Object.values(dailyRecords).filter(v => v === 'absent').length, color: '#ef4444' },
    { name: 'Late', value: Object.values(dailyRecords).filter(v => v === 'late').length, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Attendance Tracking</h1>
          <p className="text-slate-500 mt-1">
            {isStudent ? 'View your attendance record and history.' : 'Manage daily attendance and view performance reports.'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {canManageAttendance && (
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setView('marking')}
                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", view === 'marking' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              >
                Marking
              </button>
              <button 
                onClick={() => setView('reports')}
                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", view === 'reports' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              >
                Reports
              </button>
            </div>
          )}
          {isStudent && (
            <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
              <Users size={18} />
              Class {userClassId}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters (only for staff) */}
        {canManageAttendance && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <CalendarIcon size={14} />
                  Selected Date
                </label>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium text-slate-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Users size={14} />
                  Select Class
                </label>
                <select 
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium text-slate-700 appearance-none cursor-pointer"
                >
                  <option value="10A">Class 10A</option>
                  <option value="10B">Class 10B</option>
                  <option value="9A">Class 9A</option>
                  <option value="9B">Class 9B</option>
                </select>
              </div>

              {view === 'marking' && (
                <div className="pt-4 border-t border-slate-50 space-y-3">
                  <button 
                    onClick={markAllPresent}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 py-3 rounded-2xl font-bold hover:bg-emerald-100 transition-colors"
                  >
                    <CheckSquare size={18} />
                    Mark All Present
                  </button>
                  <button 
                    disabled={saving || loading}
                    onClick={saveAttendance}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all"
                  >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Attendance'}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Stats Widget */}
            {view === 'marking' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <BarChart3 size={18} className="text-blue-600" />
                  Daily Overview
                </h3>
                <div className="space-y-4">
                  {stats.map(stat => (
                    <div key={stat.name} className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 font-medium">{stat.name}</span>
                      <span className="font-bold text-slate-900">{stat.value}</span>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">Total Students</span>
                    <span className="font-black text-blue-600">{students.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <div className={cn("space-y-6", canManageAttendance ? "lg:col-span-3" : "lg:col-span-4")}>
          {view === 'marking' ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    placeholder="Search students by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-50 border-none pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student</th>
                      <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                      <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-400">Loading roster...</td></tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-400">No students found in this class.</td></tr>
                    ) : filteredStudents.map((student) => {
                      const status = dailyRecords[student.uid];
                      return (
                        <tr key={student.uid} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg">
                                {student.displayName?.[0] || 'U'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{student.displayName}</p>
                                <p className="text-xs text-slate-400 font-medium">{student.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex justify-center">
                              {status ? (
                                <motion.div 
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                                    status === 'present' ? "bg-emerald-50 text-emerald-600" :
                                    status === 'absent' ? "bg-red-50 text-red-600" :
                                    "bg-amber-50 text-amber-600"
                                  )}
                                >
                                  {status === 'present' && <CheckCircle2 size={12} />}
                                  {status === 'absent' && <XCircle size={12} />}
                                  {status === 'late' && <Clock size={12} />}
                                  {status}
                                </motion.div>
                              ) : (
                                <span className="text-xs font-bold text-slate-300 italic uppercase">Pending</span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleMark(student.uid, 'present')}
                                className={cn(
                                  "p-2.5 rounded-xl transition-all active:scale-90",
                                  status === 'present' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                                )}
                              >
                                <CheckCircle2 size={20} />
                              </button>
                              <button 
                                onClick={() => handleMark(student.uid, 'absent')}
                                className={cn(
                                  "p-2.5 rounded-xl transition-all active:scale-90",
                                  status === 'absent' ? "bg-red-600 text-white shadow-lg shadow-red-200" : "bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                )}
                              >
                                <XCircle size={20} />
                              </button>
                              <button 
                                onClick={() => handleMark(student.uid, 'late')}
                                className={cn(
                                  "p-2.5 rounded-xl transition-all active:scale-90",
                                  status === 'late' ? "bg-amber-500 text-white shadow-lg shadow-amber-200" : "bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                                )}
                              >
                                <Clock size={20} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : view === 'reports' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Summary Cards */}
                 <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Avg Attendance</p>
                    <p className="text-4xl font-black text-slate-900">92%</p>
                    <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
                      <CheckCircle2 size={14} />
                      +2% from last week
                    </div>
                 </div>
                 <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Absences</p>
                    <p className="text-4xl font-black text-slate-900">14</p>
                    <p className="mt-4 text-slate-400 text-xs font-medium">Across current month</p>
                 </div>
                 <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Late Arrivals</p>
                    <p className="text-4xl font-black text-slate-900">8</p>
                    <p className="mt-4 text-slate-400 text-xs font-medium">Requires attention</p>
                 </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-xl text-slate-900 mb-8">Attendance Trends</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {stats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Your Attendance History</h2>
                <div className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl">
                   Overall: {Math.round((history.filter(r => r.status === 'present').length / (history.length || 1)) * 100)}%
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
              ) : history.length === 0 ? (
                <div className="bg-white p-20 rounded-3xl text-center text-slate-400 border border-slate-100 flex flex-col items-center gap-4">
                  <CalendarIcon size={48} className="text-slate-200" />
                  <p className="font-medium">No attendance records found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {history.map((record, i) => (
                      <motion.div 
                        key={record.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-100 transition-colors"
                      >
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{record.date}</p>
                          <div className={cn(
                            "text-sm font-black uppercase tracking-wider transition-colors",
                            record.status === 'present' ? "text-emerald-600" :
                            record.status === 'absent' ? "text-red-600" :
                            "text-amber-600"
                          )}>
                            {record.status}
                          </div>
                        </div>
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110",
                          record.status === 'present' ? "bg-emerald-50 text-emerald-600" :
                          record.status === 'absent' ? "bg-red-50 text-red-600" :
                          "bg-amber-50 text-amber-600"
                        )}>
                          {record.status === 'present' && <CheckCircle2 size={24} />}
                          {record.status === 'absent' && <XCircle size={24} />}
                          {record.status === 'late' && <Clock size={24} />}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
