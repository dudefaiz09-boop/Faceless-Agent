import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  User as UserIcon,
  Shield,
  Search,
  Plus,
  Upload,
  History,
  X,
  Save,
  Trash2,
  Filter,
  GraduationCap,
  Clock,
  MoreVertical,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { apiClient } from '../lib/api-client';
import { useDebounce } from '../lib/hooks';
import { StudentProfile, AuditLog, BulkImportResult } from '@educonnect/shared';

export const StudentsPage = () => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    classId: '',
    section: '',
  });

  const [bulkText, setBulkText] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), where('roles', 'array-contains', 'student'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => doc.data() as StudentProfile);
        setStudents(data);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    );

    return () => unsubscribe();
  }, []);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.request('/api/students/create', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setIsAddModalOpen(false);
      setFormData({ email: '', password: '', displayName: '', classId: '', section: '' });
      alert('Student created successfully');
    } catch (error) {
      alert('Error creating student: ' + (error as Error).message);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      await apiClient.request(`/api/students/${selectedStudent.uid}`, {
        method: 'PUT',
        body: JSON.stringify({
          displayName: formData.displayName,
          classId: formData.classId,
          section: formData.section,
        }),
      });
      setSelectedStudent(null);
      setFormData({ email: '', password: '', displayName: '', classId: '', section: '' });
      alert('Student updated successfully');
    } catch (error) {
      alert('Error updating student: ' + (error as Error).message);
    }
  };

  const handleDeleteStudent = async (uid: string) => {
    if (
      !window.confirm('Are you sure you want to delete this student? This action cannot be undone.')
    )
      return;
    try {
      await apiClient.request(`/api/students/${uid}`, { method: 'DELETE' });
      alert('Student deleted successfully');
    } catch (error) {
      alert('Error deleting student: ' + (error as Error).message);
    }
  };

  const handleBulkImport = async () => {
    const lines = bulkText.trim().split('\n');
    const studentsToImport = lines.map((line) => {
      const [email, displayName, classId, section, password] = line.split(',').map((s) => s.trim());
      return { email, displayName, classId, section, password };
    });

    try {
      const result = await apiClient.request<{ results: BulkImportResult[] }>(
        '/api/students/bulk-import',
        {
          method: 'POST',
          body: JSON.stringify({ students: studentsToImport }),
        }
      );
      setIsBulkModalOpen(false);
      setBulkText('');
      alert(
        `Import completed. Success: ${result.results.filter((r: any) => r.success).length}, Failed: ${result.results.filter((r: any) => !r.success).length}`
      );
    } catch (error) {
      alert('Bulk import failed: ' + (error as Error).message);
    }
  };

  const viewAuditLogs = async (studentUid?: string) => {
    setIsAuditModalOpen(true);
    // In a real app, we'd fetch this via API or Firestore query
    const q = query(
      collection(db, 'auditLogs'),
      studentUid ? where('targetUid', '==', studentUid) : orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAuditLogs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AuditLog));
    });

    return () => unsubscribe();
  };

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.displayName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      s.email?.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesClass = selectedClass === 'all' || s.classId === selectedClass;
    return matchesSearch && matchesClass;
  });

  const classes = Array.from(new Set(students.map((s) => s.classId).filter(Boolean)));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Student Management</h1>
          <p className="text-slate-500 font-medium mt-1 text-lg">
            Manage profiles, academic records, and access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setFormData({ email: '', password: '', displayName: '', classId: '', section: '' });
              setIsAddModalOpen(true);
            }}
            className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <Plus size={20} />
            Add Student
          </button>
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Upload size={20} />
            Bulk Import
          </button>
          <button
            onClick={() => viewAuditLogs()}
            className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <History size={20} />
            System Logs
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 pl-14 pr-6 py-4 rounded-3xl focus:ring-4 focus:ring-blue-100 outline-none text-base transition-all shadow-sm font-medium"
          />
        </div>

        <div className="flex items-center gap-2 px-4 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <Filter size={18} className="text-slate-400" />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="py-4 bg-transparent outline-none text-sm font-bold text-slate-600 pr-4"
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Student List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filtered.map((s) => (
            <motion.div
              key={s.uid}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6">
                <button
                  onClick={() => {
                    setSelectedStudent(s);
                    setFormData({
                      email: s.email,
                      password: '',
                      displayName: s.displayName,
                      classId: s.classId || '',
                      section: s.section || '',
                    });
                  }}
                  className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <MoreVertical size={20} />
                </button>
              </div>

              <div className="flex items-center gap-5 mb-8">
                <div className="w-16 h-16 rounded-[24px] bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 transform group-hover:rotate-6">
                  <GraduationCap size={32} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-black text-slate-900 truncate leading-tight">
                    {s.displayName || 'Unnamed Student'}
                  </h3>
                  <p className="text-sm text-slate-400 font-bold truncate tracking-wide">
                    {s.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Class
                  </p>
                  <p className="font-bold text-slate-900">{s.classId || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Section
                  </p>
                  <p className="font-bold text-slate-900">{s.section || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => viewAuditLogs(s.uid)}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-50 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                >
                  <History size={14} />
                  Logs
                </button>
                <button
                  onClick={() => handleDeleteStudent(s.uid)}
                  className="px-4 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(isAddModalOpen || selectedStudent) && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[100]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddModalOpen(false);
                setSelectedStudent(null);
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[48px] shadow-2xl overflow-hidden p-12"
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-3xl font-black text-slate-900">
                    {selectedStudent ? 'Edit Profile' : 'New Student'}
                  </h3>
                  <p className="text-slate-500 font-medium mt-1">
                    Configure student identity and academic assignment.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setSelectedStudent(null);
                  }}
                  className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form
                onSubmit={selectedStudent ? handleUpdateStudent : handleCreateStudent}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-full">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                      <UserIcon size={14} /> Full Name
                    </label>
                    <input
                      required
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                    />
                  </div>
                  {!selectedStudent && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                          Temp Password
                        </label>
                        <input
                          type="password"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                        />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                      Class
                    </label>
                    <input
                      value={formData.classId}
                      onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                      placeholder="e.g. 10A"
                      className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                      Section
                    </label>
                    <input
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      placeholder="e.g. A"
                      className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-6 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
                  >
                    <Save size={20} />
                    {selectedStudent ? 'Save Changes' : 'Create Student'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setSelectedStudent(null);
                    }}
                    className="px-10 bg-slate-100 text-slate-500 py-6 rounded-[24px] font-black uppercase tracking-widest text-sm hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[100]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBulkModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[48px] shadow-2xl overflow-hidden p-12"
            >
              <div className="space-y-2 mb-10">
                <h3 className="text-3xl font-black text-slate-900">Bulk Student Import</h3>
                <p className="text-slate-500 font-medium">
                  Paste CSV records to create multiple accounts at once.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Upload size={14} /> Paste CSV Data
                  </label>
                  <textarea
                    required
                    rows={8}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="email, name, class, section, password&#10;alice@school.test, Alice Smith, 10A, A, TestPass123!&#10;bob@school.test, Bob Jones, 10B, B, TestPass123!"
                    className="w-full bg-slate-50 border border-slate-100 p-8 rounded-[32px] outline-none focus:ring-4 focus:ring-blue-100 transition-all font-mono text-sm leading-relaxed"
                  />
                  <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Shield size={14} /> Format Guidelines
                    </p>
                    <p className="text-sm text-blue-800 font-medium">
                      Email, Full Name, Class, Section, Password (one per line)
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleBulkImport}
                    className="flex-1 bg-blue-600 text-white py-6 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
                  >
                    Start Import
                  </button>
                  <button
                    onClick={() => setIsBulkModalOpen(false)}
                    className="px-10 bg-slate-100 text-slate-500 py-6 rounded-[24px] font-black uppercase tracking-widest text-sm hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Audit Logs Modal */}
      <AnimatePresence>
        {isAuditModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[100]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuditModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-10 border-b border-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                    <History size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Activity Logs</h3>
                    <p className="text-slate-500 font-medium">
                      Tracking system changes and student lifecycle.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAuditModalOpen(false)}
                  className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-4">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex gap-6 items-start"
                  >
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                        log.action === 'create'
                          ? 'bg-green-100 text-green-600'
                          : log.action === 'delete'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-blue-100 text-blue-600'
                      )}
                    >
                      {log.action === 'create' ? (
                        <Plus size={20} />
                      ) : log.action === 'delete' ? (
                        <Trash2 size={20} />
                      ) : (
                        <Clock size={20} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                          {log.action}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {(log.timestamp as any)?.toDate?.().toLocaleString() || 'Just now'}
                        </span>
                      </div>
                      <p className="text-slate-900 font-bold">{log.details}</p>
                      <p className="text-xs text-slate-500 mt-2 font-medium">
                        Performed by UID: {log.performedBy}
                      </p>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
                      <Clock size={40} className="text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold">
                      No activity logs found for this selection.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
            Syncing Registry...
          </p>
        </div>
      )}
    </div>
  );
};
