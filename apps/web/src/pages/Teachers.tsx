import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User as UserIcon,
  Plus,
  Upload,
  History,
  X,
  Save,
  Trash2,
  BookOpen,
  Briefcase,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { usersService } from '../lib/api-client';
import { useDebounce } from '../lib/hooks';
import { TeacherProfile, AuditLog, BulkImportResult } from '@educonnect/shared';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState } from '../components/saas/EmptyState';
import { SearchBar } from '../components/saas/SearchBar';
import { StatCard } from '../components/saas/StatCard';
import { PageHeader } from '../components/ui/PageHeader';
import { PageShell } from '../components/ui/PageShell';
import { useToast } from '../components/saas/ToastProvider';

type TeacherDocument = TeacherProfile & {
  id?: string;
  uid?: string;
  role?: string;
  roles?: string[];
  subjectIds?: string[];
  classIds?: string[];
  subjects?: string[];
  classes?: string[];
  email?: string;
  displayName?: string;
};

function isTeacherProfile(profile: TeacherDocument) {
  return profile.role === 'teacher' || profile.roles?.includes('teacher');
}

function getTeacherUid(profile: TeacherDocument) {
  return profile.uid || profile.id || '';
}

function formatAuditTimestamp(timestamp: unknown) {
  if (!timestamp) return 'Just now';
  const value = timestamp as { toDate?: () => Date };
  return value.toDate?.().toLocaleString() || new Date(String(timestamp)).toLocaleString();
}

function teacherSubjects(teacher: TeacherDocument) {
  return teacher.subjects || teacher.subjectIds || [];
}

function teacherClasses(teacher: TeacherDocument) {
  return teacher.classes || teacher.classIds || [];
}

function splitCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const TeachersPage = () => {
  const { isAdmin, schoolId } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [teachers, setTeachers] = useState<TeacherDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherDocument | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    subjects: '',
    classes: '',
  });

  const [bulkText, setBulkText] = useState('');

  const reloadTeachers = useCallback(async () => {
    setLoading(true);

    try {
      const data = (await usersService.list({
        tenantId: schoolId || undefined,
        role: 'teacher',
        limit: 250,
      })) as TeacherDocument[];

      setTeachers(Array.isArray(data) ? data.filter(isTeacherProfile) : []);
    } catch (error) {
      console.error('Failed to load teachers:', error);
      toast({
        tone: 'error',
        title: 'Teachers unavailable',
        description: error instanceof Error ? error.message : 'Unable to load teachers.',
      });
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, toast]);

  useEffect(() => {
    void reloadTeachers();
  }, [reloadTeachers]);

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      displayName: '',
      subjects: '',
      classes: '',
    });
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      await usersService.create(
        {
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName,
          role: 'teacher',
          roles: ['teacher'],
          tenantId: schoolId || undefined,
          subjectIds: splitCsv(formData.subjects),
          classIds: splitCsv(formData.classes),
        },
        `teacher-create-${Date.now()}`
      );

      setIsAddModalOpen(false);
      resetForm();

      toast({
        tone: 'success',
        title: 'Teacher created',
        description: `${formData.displayName} was added.`,
      });

      void reloadTeachers();
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Teacher creation failed',
        description: error instanceof Error ? error.message : 'Unable to create teacher.',
      });
    }
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedTeacher) return;

    const uid = getTeacherUid(selectedTeacher);
    if (!uid) return;

    try {
      await usersService.update(uid, {
        displayName: formData.displayName,
        subjectIds: splitCsv(formData.subjects),
        classIds: splitCsv(formData.classes),
      });

      setSelectedTeacher(null);
      resetForm();

      toast({
        tone: 'success',
        title: 'Teacher updated',
        description: 'Faculty assignment changes were saved.',
      });

      void reloadTeachers();
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Teacher update failed',
        description: error instanceof Error ? error.message : 'Unable to update teacher.',
      });
    }
  };

  const handleDeleteTeacher = async (uid: string) => {
    if (!isAdmin || !uid) return;
    if (!window.confirm('Deactivate this teacher? They can be restored later by an admin.')) return;

    try {
      await usersService.deactivate(uid);

      toast({
        tone: 'success',
        title: 'Teacher deactivated',
        description: 'The faculty member was marked inactive.',
      });

      void reloadTeachers();
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Teacher deactivate failed',
        description: error instanceof Error ? error.message : 'Unable to deactivate teacher.',
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
        description: 'Paste at least one teacher row before importing.',
      });
      return;
    }

    const teachersToImport = lines.map((line) => {
      const [email, displayName, subjects, classes, password] = line
        .split(',')
        .map((item) => item.trim());

      return {
        email,
        displayName,
        subjects: subjects
          ? subjects
              .split(';')
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
        classes: classes
          ? classes
              .split(';')
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
        password,
      };
    });

    try {
      const result = (await usersService.bulkImport(
        teachersToImport.map((teacher) => ({
          email: teacher.email,
          password: teacher.password,
          displayName: teacher.displayName,
          role: 'teacher',
          roles: ['teacher'],
          tenantId: schoolId || undefined,
          subjectIds: teacher.subjects,
          classIds: teacher.classes,
        })),
        `teachers-import-${Date.now()}`
      )) as { results: BulkImportResult[] };

      setIsBulkModalOpen(false);
      setBulkText('');

      toast({
        tone: 'success',
        title: 'Faculty import complete',
        description: `Success: ${result.results.filter((r) => r.success).length}, Failed: ${
          result.results.filter((r) => !r.success).length
        }`,
      });

      void reloadTeachers();
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Bulk import failed',
        description: error instanceof Error ? error.message : 'Unable to import teachers.',
      });
    }
  };

  const viewAuditLogs = async (teacherUid?: string) => {
    setIsAuditModalOpen(true);

    try {
      const logs = (await usersService.listAuditLogs({
        targetUid: teacherUid,
        limit: 50,
      })) as AuditLog[];

      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      toast({
        tone: 'error',
        title: 'Audit logs unavailable',
        description: 'Unable to load faculty activity history.',
      });
      setAuditLogs([]);
    }
  };

  const filtered = teachers.filter((teacher) => {
    const query = debouncedSearch.toLowerCase();
    return (
      teacher.displayName?.toLowerCase().includes(query) ||
      teacher.email?.toLowerCase().includes(query) ||
      teacherSubjects(teacher).some((subject) => subject.toLowerCase().includes(query))
    );
  });

  const subjectCount = new Set(teachers.flatMap(teacherSubjects).filter(Boolean)).size;
  const classCount = new Set(teachers.flatMap(teacherClasses).filter(Boolean)).size;

  return (
    <PageShell>
      <PageHeader
        title="Faculty Management"
        description="Assign subjects, manage classes, and track staff activity."
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
              Add Teacher
            </button>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <Upload size={18} />
              Bulk Onboarding
            </button>
            <button
              onClick={() => viewAuditLogs()}
              className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <History size={18} />
              Audit Logs
            </button>
          </div>
        )}
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Teachers"
          value={String(teachers.length)}
          detail="Faculty records"
          icon={UserIcon}
          tone="blue"
        />
        <StatCard
          title="Subjects"
          value={String(subjectCount)}
          detail="Covered by faculty"
          icon={BookOpen}
          tone="violet"
        />
        <StatCard
          title="Classes"
          value={String(classCount)}
          detail="Assigned classrooms"
          icon={Briefcase}
          tone="cyan"
        />
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by name, email, or subject..."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filtered.map((teacher) => {
            const uid = getTeacherUid(teacher);

            return (
              <motion.div
                key={uid}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6">
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setSelectedTeacher(teacher);
                        setFormData({
                          email: teacher.email || '',
                          password: '',
                          displayName: teacher.displayName || '',
                          subjects: teacherSubjects(teacher).join(', '),
                          classes: teacherClasses(teacher).join(', '),
                        });
                      }}
                      className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-5 mb-8">
                  <div className="w-16 h-16 rounded-[24px] bg-slate-900 flex items-center justify-center text-white group-hover:bg-blue-600 transition-all duration-500 transform group-hover:-rotate-6">
                    <UserIcon size={32} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-black text-slate-900 truncate leading-tight">
                      {teacher.displayName || 'Unnamed Teacher'}
                    </h3>
                    <p className="text-sm text-slate-400 font-bold truncate tracking-wide">
                      {teacher.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <BookOpen size={10} /> Subjects
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {teacherSubjects(teacher).map((subject) => (
                        <span
                          key={subject}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600"
                        >
                          {subject}
                        </span>
                      ))}
                      {teacherSubjects(teacher).length === 0 && (
                        <span className="text-xs text-slate-400 italic">None assigned</span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Briefcase size={10} /> Classes
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {teacherClasses(teacher).map((classId) => (
                        <span
                          key={classId}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600"
                        >
                          {classId}
                        </span>
                      ))}
                      {teacherClasses(teacher).length === 0 && (
                        <span className="text-xs text-slate-400 italic">None assigned</span>
                      )}
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      onClick={() => viewAuditLogs(uid)}
                      className="flex-1 px-4 py-3 rounded-xl bg-slate-50 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <History size={14} />
                      History
                    </button>
                    <button
                      onClick={() => handleDeleteTeacher(uid)}
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
          icon={UserIcon}
          title="No teachers found"
          description="Adjust search terms or add a new faculty record."
        />
      )}

      <AnimatePresence>
        {(isAddModalOpen || selectedTeacher) && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[100]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddModalOpen(false);
                setSelectedTeacher(null);
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
                    {selectedTeacher ? 'Update Faculty' : 'Register Teacher'}
                  </h3>
                  <p className="text-slate-500 font-medium mt-1">
                    Manage core credentials and academic specialization.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setSelectedTeacher(null);
                  }}
                  className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form
                onSubmit={selectedTeacher ? handleUpdateTeacher : handleCreateTeacher}
                className="space-y-8"
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                      Full Name
                    </label>
                    <input
                      required
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                    />
                  </div>

                  {!selectedTeacher && (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                          Email
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
                          Password
                        </label>
                        <input
                          type="password"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                      Subjects (comma separated)
                    </label>
                    <input
                      value={formData.subjects}
                      onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
                      placeholder="e.g. Mathematics, Physics"
                      className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                      Assigned Classes (comma separated)
                    </label>
                    <input
                      value={formData.classes}
                      onChange={(e) => setFormData({ ...formData, classes: e.target.value })}
                      placeholder="e.g. 10A, 10B, 11C"
                      className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 text-white py-6 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
                  >
                    <Save size={20} />
                    {selectedTeacher ? 'Update Record' : 'Register Faculty'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setSelectedTeacher(null);
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
                  Bulk Faculty Import
                </h3>
                <p className="text-slate-500 font-medium">
                  Import large batches of staff using standardized CSV data.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Upload size={14} /> CSV Data (Email, Name, Subjects, Classes, Password)
                  </label>
                  <textarea
                    required
                    rows={8}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="email, name, Math;Science, 10A;10B, Pass123!"
                    className="w-full bg-slate-50 border border-slate-100 p-8 rounded-[32px] outline-none focus:ring-4 focus:ring-blue-100 transition-all font-mono text-sm leading-relaxed"
                  />
                  <div className="p-6 bg-slate-900 rounded-3xl shadow-lg shadow-slate-100">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">
                      Note:
                    </p>
                    <p className="text-sm text-white font-medium">
                      Use semicolon (;) to separate multiple subjects or classes within a single
                      field.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleBulkImport}
                    className="flex-1 bg-blue-600 text-white py-6 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
                  >
                    Execute Import
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
              <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/20">
                    <History size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black">Staff Activity Logs</h3>
                    <p className="text-slate-400 font-medium">
                      Verifiable history of administrative actions.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAuditModalOpen(false)}
                  className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-4">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-6 rounded-3xl bg-white border border-slate-100 flex gap-6 items-start shadow-sm dark:bg-slate-950 dark:border-slate-800"
                  >
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                        log.action.includes('create')
                          ? 'bg-green-100 text-green-600'
                          : log.action.includes('delete')
                            ? 'bg-red-100 text-red-600'
                            : 'bg-blue-100 text-blue-600'
                      )}
                    >
                      {log.action.includes('create') ? (
                        <Plus size={20} />
                      ) : log.action.includes('delete') ? (
                        <Trash2 size={20} />
                      ) : (
                        <Clock size={20} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black uppercase tracking-widest text-blue-600">
                          {log.action.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {formatAuditTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-slate-900 font-bold text-lg leading-snug dark:text-slate-100">
                        {log.details}
                      </p>
                      <p className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-2 dark:text-slate-400">
                        <UserIcon size={12} /> Executor UID:{' '}
                        <span className="text-slate-900 font-bold dark:text-slate-200">
                          {log.performedBy}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}

                {auditLogs.length === 0 && (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
                      <Clock size={40} className="text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold">No system activity captured yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
            Accessing Faculty Records...
          </p>
        </div>
      )}
    </PageShell>
  );
};
