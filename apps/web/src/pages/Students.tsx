import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User as UserIcon,
  Shield,
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
import { usersService } from '../lib/api-client';
import { useDebounce } from '../lib/hooks';
import { StudentProfile, AuditLog, BulkImportResult } from '@educonnect/shared';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState } from '../components/saas/EmptyState';
import { SearchBar } from '../components/saas/SearchBar';
import { StatCard } from '../components/saas/StatCard';
import { PageHeader } from '../components/ui/PageHeader';
import { PageShell } from '../components/ui/PageShell';
import { useToast } from '../components/saas/ToastProvider';

type StudentDocument = StudentProfile & {
  id?: string;
  uid?: string;
  role?: string;
  roles?: string[];
  classId?: string;
  classIds?: string[];
  section?: string;
  sectionIds?: string[];
  email?: string;
  displayName?: string;
};

function isStudentProfile(profile: StudentDocument) {
  return profile.role === 'student' || profile.roles?.includes('student');
}

function getStudentUid(profile: StudentDocument) {
  return profile.uid || profile.id || '';
}

function getStudentClass(profile: StudentDocument) {
  return profile.classId || profile.classIds?.[0] || '';
}

function getStudentSection(profile: StudentDocument) {
  return profile.section || profile.sectionIds?.[0] || '';
}

function formatAuditTimestamp(timestamp: unknown) {
  if (!timestamp) return 'Just now';
  const value = timestamp as { toDate?: () => Date };
  return value.toDate?.().toLocaleString() || new Date(String(timestamp)).toLocaleString();
}

export const StudentsPage = () => {
  const { isAdmin, schoolId } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [students, setStudents] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentDocument | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    classId: '',
    section: '',
  });

  const [bulkText, setBulkText] = useState('');

  const reloadStudents = useCallback(async () => {
    setLoading(true);

    try {
      const data = (await usersService.list({
        tenantId: schoolId || undefined,
        role: 'student',
        limit: 250,
      })) as StudentDocument[];

      setStudents(Array.isArray(data) ? data.filter(isStudentProfile) : []);
    } catch (error) {
      console.error('Failed to load students:', error);
      toast({
        tone: 'error',
        title: 'Students unavailable',
        description: error instanceof Error ? error.message : 'Unable to load students.',
      });
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, toast]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void reloadStudents();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [reloadStudents]);

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      displayName: '',
      classId: '',
      section: '',
    });
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      await usersService.create(
        {
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName,
          role: 'student',
          roles: ['student'],
          tenantId: schoolId || undefined,
          classIds: formData.classId ? [formData.classId] : [],
          sectionIds: formData.section ? [formData.section] : [],
        },
        `student-create-${Date.now()}`
      );

      setIsAddModalOpen(false);
      resetForm();

      toast({
        tone: 'success',
        title: 'Student created',
        description: `${formData.displayName} was added.`,
      });

      void reloadStudents();
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Student creation failed',
        description: error instanceof Error ? error.message : 'Unable to create student.',
      });
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedStudent) return;

    const uid = getStudentUid(selectedStudent);
    if (!uid) return;

    try {
      await usersService.update(uid, {
        displayName: formData.displayName,
        classIds: formData.classId ? [formData.classId] : [],
        sectionIds: formData.section ? [formData.section] : [],
      });

      setSelectedStudent(null);
      resetForm();

      toast({
        tone: 'success',
        title: 'Student updated',
        description: 'Profile changes were saved.',
      });

      void reloadStudents();
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Student update failed',
        description: error instanceof Error ? error.message : 'Unable to update student.',
      });
    }
  };

  const handleDeleteStudent = async (uid: string) => {
    if (!isAdmin || !uid) return;
    if (!window.confirm('Deactivate this student? They can be restored later by an admin.')) return;

    try {
      await usersService.deactivate(uid);

      toast({
        tone: 'success',
        title: 'Student deactivated',
        description: 'The student was marked inactive.',
      });

      void reloadStudents();
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Student deactivate failed',
        description: error instanceof Error ? error.message : 'Unable to deactivate student.',
      });
    }
  };

  const handleBulkImport = async () => {
    if (!isAdmin) return;

    const lines = bulkText
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      toast({
        tone: 'error',
        title: 'No data',
        description: 'Paste at least one student row before importing.',
      });
      return;
    }

    const studentsToImport = lines.map((line) => {
      const [email, displayName, classId, section, password] = line.split(',').map((s) => s.trim());

      return {
        email,
        displayName,
        classId,
        section,
        password,
      };
    });

    try {
      const result = (await usersService.bulkImport(
        studentsToImport.map((student) => ({
          email: student.email,
          password: student.password,
          displayName: student.displayName,
          role: 'student',
          roles: ['student'],
          tenantId: schoolId || undefined,
          classIds: student.classId ? [student.classId] : [],
          sectionIds: student.section ? [student.section] : [],
        })),
        `students-import-${Date.now()}`
      )) as { results: BulkImportResult[] };

      setIsBulkModalOpen(false);
      setBulkText('');

      toast({
        tone: 'success',
        title: 'Student import complete',
        description: `Success: ${result.results.filter((r) => r.success).length}, Failed: ${
          result.results.filter((r) => !r.success).length
        }`,
      });

      void reloadStudents();
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Bulk import failed',
        description: error instanceof Error ? error.message : 'Unable to import students.',
      });
    }
  };

  const viewAuditLogs = async (studentUid?: string) => {
    setIsAuditModalOpen(true);

    try {
      const logs = (await usersService.listAuditLogs({
        targetUid: studentUid,
        limit: 50,
      })) as AuditLog[];

      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      toast({
        tone: 'error',
        title: 'Audit logs unavailable',
        description: 'Unable to load student activity history.',
      });
      setAuditLogs([]);
    }
  };

  const filtered = students.filter((student) => {
    const query = debouncedSearch.toLowerCase();
    const matchesSearch =
      student.displayName?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query);
    const matchesClass = selectedClass === 'all' || getStudentClass(student) === selectedClass;
    return matchesSearch && matchesClass;
  });

  const classes = Array.from(new Set(students.map(getStudentClass).filter(Boolean)));
  const sectionCount = new Set(students.map(getStudentSection).filter(Boolean)).size;

  return (
    <PageShell>
      <PageHeader
        title="Student Management"
        description="Manage profiles, academic records, and access."
      >
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            >
              <Plus size={18} />
              Add Student
            </button>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <Upload size={18} />
              Bulk Import
            </button>
            <button
              onClick={() => viewAuditLogs()}
              className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <History size={18} />
              System Logs
            </button>
          </div>
        )}
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Students"
          value={String(students.length)}
          detail="Total enrolled"
          icon={GraduationCap}
          tone="blue"
        />
        <StatCard
          title="Classes"
          value={String(classes.length)}
          detail="With assigned students"
          icon={Filter}
          tone="violet"
        />
        <StatCard
          title="Sections"
          value={String(sectionCount)}
          detail="Across active classes"
          icon={Shield}
          tone="cyan"
        />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email..."
          className="flex-1"
        />

        <div className="flex items-center gap-2 px-4 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <Filter size={18} className="text-slate-400" />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="py-4 bg-transparent outline-none text-sm font-bold text-slate-600 pr-4"
          >
            <option value="all">All Classes</option>
            {classes.map((classId) => (
              <option key={classId} value={classId}>
                Class {classId}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filtered.map((student) => {
            const uid = getStudentUid(student);
            const classId = getStudentClass(student);
            const section = getStudentSection(student);

            return (
              <motion.div
                key={uid}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
              >
                {isAdmin && (
                  <div className="absolute top-0 right-0 p-6">
                    <button
                      onClick={() => {
                        setSelectedStudent(student);
                        setFormData({
                          email: student.email || '',
                          password: '',
                          displayName: student.displayName || '',
                          classId,
                          section,
                        });
                      }}
                      className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <MoreVertical size={20} />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-5 mb-8">
                  <div className="w-16 h-16 rounded-[24px] bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 transform group-hover:rotate-6">
                    <GraduationCap size={32} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-black text-slate-900 truncate leading-tight">
                      {student.displayName || 'Unnamed Student'}
                    </h3>
                    <p className="text-sm text-slate-400 font-bold truncate tracking-wide">
                      {student.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Class
                    </p>
                    <p className="font-bold text-slate-900">{classId || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Section
                    </p>
                    <p className="font-bold text-slate-900">{section || 'N/A'}</p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => viewAuditLogs(uid)}
                      className="flex-1 px-4 py-3 rounded-xl bg-slate-50 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <History size={14} />
                      Logs
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(uid)}
                      className="px-4 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title="No students found"
          description="Adjust your search or class filter, or add a new student."
        />
      )}

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
              className="relative w-full max-w-xl bg-white rounded-[48px] shadow-2xl overflow-hidden p-12 dark:bg-slate-900 dark:border dark:border-slate-800 dark:text-slate-50"
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">
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
              className="relative w-full max-w-2xl bg-white rounded-[48px] shadow-2xl overflow-hidden p-12 dark:bg-slate-900 dark:border dark:border-slate-800 dark:text-slate-50"
            >
              <div className="space-y-2 mb-10">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  Bulk Student Import
                </h3>
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
              className="relative w-full max-w-4xl bg-white rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] dark:bg-slate-900 dark:border dark:border-slate-800 dark:text-slate-50"
            >
              <div className="p-10 border-b border-slate-50 flex justify-between items-center dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center dark:bg-slate-800">
                    <History size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                      Activity Logs
                    </h3>
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
                    className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex gap-6 items-start dark:bg-slate-950 dark:border-slate-800"
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
                          {formatAuditTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-slate-900 font-bold dark:text-slate-100">{log.details}</p>
                      <p className="text-xs text-slate-500 mt-2 font-medium dark:text-slate-400">
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
    </PageShell>
  );
};
