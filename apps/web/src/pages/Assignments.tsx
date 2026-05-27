import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Send,
  AlertCircle,
  FileText,
  Calendar as CalendarIcon,
  Users,
  GraduationCap,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ASSIGNMENT_STATUS,
  Assignment,
  AssignmentSubmission as Submission,
} from '@educonnect/shared-education';
import { ApiRequestError } from '@educonnect/shared-api';
import { assignmentsService } from '../lib/api-client';
import { getApiBaseUrlDiagnostic } from '../lib/env';
import { FileUpload } from '../components/FileUpload';
import { EmptyState } from '../components/saas/EmptyState';
import { SearchBar } from '../components/saas/SearchBar';
import { StatCard } from '../components/saas/StatCard';
import { PageHeader } from '../components/ui/PageHeader';
import { PageShell } from '../components/ui/PageShell';
import { useToast } from '../components/saas/ToastProvider';

type AssignmentDisplay = Assignment & {
  subject?: string;
  subjectId?: string;
  subject_id?: string;
  status?: string;
  submissionCount?: number;
  submissionsCount?: number;
  targetClasses?: string[];
  classIds?: string[];
};

type AssignmentErrorState = {
  message: string;
  kind?: string;
};

function toAssignmentErrorState(error: unknown): AssignmentErrorState {
  if (error instanceof ApiRequestError) {
    return {
      message: error.message,
      kind: error.kind,
    };
  }

  const maybeApiError = error as { message?: string; kind?: string } | null;
  return {
    message: maybeApiError?.message || 'Unable to load assignments for this class.',
    kind: maybeApiError?.kind,
  };
}

export const AssignmentsPage = () => {
  const { user, isStudent, canManageAssignments, classId: userClassId, schoolId } = useAuth();
  const { toast } = useToast();
  const uid = user?.uid;
  const [classOptions] = useState<Array<{ id: string; label: string; section: string }>>([]);

  const [selectedClass, setSelectedClass] = useState(userClassId || '');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => Date.now());

  // Local State replacement for hooks
  const [assignmentsData, setAssignmentsData] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [error, setError] = useState<AssignmentErrorState | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await assignmentsService.getAssignments(selectedClass);
      const data = Array.isArray(result)
        ? result.filter((assignment) => (assignment as AssignmentDisplay).status !== 'archived')
        : [];
      setAssignmentsData(data);
      setLastSyncTime(Date.now());
    } catch (err) {
      setAssignmentsData([]);
      setError(toAssignmentErrorState(err));
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAssignments();
  }, [loadAssignments]);

  // Clear selected assignment when class changes to prevent cross-class state leakage
  useEffect(() => {
    queueMicrotask(() => setSelectedAssignment(null));
  }, [selectedClass]);

  // Guard against invalid data
  const assignments = useMemo(
    () => (Array.isArray(assignmentsData) ? assignmentsData.filter((a) => a && a.id) : []),
    [assignmentsData]
  );

  // Creation Form State
  const [newAssignment, setNewAssignment] = useState(() => ({
    title: '',
    description: '',
    dueDate: format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd'),
    classId: userClassId || '',
    subject: 'General',
    pointsPossible: 100,
  }));
  const [assignmentAttachmentUrl, setAssignmentAttachmentUrl] = useState('');

  useEffect(() => {
    if (classOptions.length > 0 && !classOptions.some((option) => option.id === selectedClass)) {
      queueMicrotask(() => setSelectedClass(userClassId || classOptions[0]?.id || ''));
    }
  }, [classOptions, selectedClass, userClassId]);

  useEffect(() => {
    queueMicrotask(() =>
      setNewAssignment((current) => ({
        ...current,
        classId: classOptions.some((option) => option.id === current.classId)
          ? current.classId
          : selectedClass,
      }))
    );
  }, [classOptions, selectedClass]);

  const loadSubmissions = useCallback(async () => {
    if (!selectedAssignment?.id || !canManageAssignments) {
      setSubmissions([]);
      return;
    }
    setSubmissionsLoading(true);
    try {
      const result = await assignmentsService.getSubmissions(selectedAssignment.id);
      setSubmissions(Array.isArray(result) ? result : []);
    } catch {
      setSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  }, [selectedAssignment, canManageAssignments]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSubmissions();
  }, [loadSubmissions]);

  // Sync selected assignment after reload
  useEffect(() => {
    if (selectedAssignment && assignments.length > 0) {
      const exists = assignments.find((a) => a.id === selectedAssignment.id);
      if (!exists) {
        queueMicrotask(() => setSelectedAssignment(null));
      } else if (exists !== selectedAssignment) {
        // Refresh the selected assignment object to keep it in sync
        queueMicrotask(() => setSelectedAssignment(exists));
      }
    }
  }, [assignments, selectedAssignment]);

  const [gradingState, setGradingState] = useState<{
    studentId: string;
    grade: string;
    feedback: string;
  } | null>(null);

  // Student Submission Form
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionFileUrl, setSubmissionFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<Record<string, Submission>>({});

  const loadMyHistory = useCallback(async () => {
    if (!uid) return;
    try {
      const data = await assignmentsService.getMyHistory(uid);
      const map: Record<string, Submission> = {};
      if (Array.isArray(data)) {
        data.forEach((s: Submission) => (map[s.assignmentId] = s));
      }
      setMySubmissions(map);
    } catch (err) {
      console.error(err);
    }
  }, [uid]);

  useEffect(() => {
    if (isStudent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadMyHistory();
    }
  }, [loadMyHistory, isStudent]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await assignmentsService.createAssignment({
        ...newAssignment,
        tenantId: schoolId || undefined,
        status: ASSIGNMENT_STATUS.PUBLISHED,
        targetClasses: [newAssignment.classId],
        subject: newAssignment.subject,
        attachments: assignmentAttachmentUrl
          ? [{ name: 'Reference file', url: assignmentAttachmentUrl, type: 'link' }]
          : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setIsModalOpen(false);
      setNewAssignment({ ...newAssignment, title: '', description: '' });
      setAssignmentAttachmentUrl('');
      toast({
        tone: 'success',
        title: 'Assignment created',
        description: `${newAssignment.title} was published for ${newAssignment.classId}.`,
      });
      void loadAssignments();
    } catch (error) {
      const apiError = error as Error & { data?: { message?: string; error?: string } };
      toast({
        tone: 'error',
        title: 'Assignment creation failed',
        description:
          apiError.data?.message ||
          apiError.data?.error ||
          apiError.message ||
          'Check required fields and try again.',
      });
    }
  };

  const handleGrade = async () => {
    if (!gradingState || !selectedAssignment) return;
    try {
      await assignmentsService.gradeSubmission({
        assignmentId: selectedAssignment.id,
        studentId: gradingState.studentId,
        teacherScore: gradingState.grade,
        teacherFeedback: gradingState.feedback,
      });
      setGradingState(null);
      toast({
        tone: 'success',
        title: 'Grade published',
        description: 'The student can now view the final feedback.',
      });
      void loadSubmissions();
    } catch {
      toast({
        tone: 'error',
        title: 'Grading failed',
        description: 'Unable to publish this grade right now.',
      });
    }
  };

  const submitAssignment = async (assignmentId: string) => {
    setIsSubmitting(true);
    try {
      await assignmentsService.submitAssignment({
        assignmentId,
        content: submissionContent,
        fileUrl: submissionFileUrl,
      });
      setSubmissionContent('');
      setSubmissionFileUrl('');
      setSelectedAssignment(null);
      void loadMyHistory();
      void loadAssignments();
      toast({
        tone: 'success',
        title: 'Submission uploaded',
        description: 'Your work was submitted and queued for review.',
      });
    } catch {
      toast({
        tone: 'error',
        title: 'Submission failed',
        description: 'Please check your answer or attachment and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      if (!assignment || !assignment.id) return false;
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return (
        (assignment.title || '').toLowerCase().includes(query) ||
        (assignment.description || '').toLowerCase().includes(query) ||
        (assignment.classId || '').toLowerCase().includes(query)
      );
    });
  }, [assignments, search]);

  const submittedCount = useMemo(() => Object.keys(mySubmissions).length, [mySubmissions]);
  const dueSoonCount = useMemo(() => {
    const weekInMs = 7 * 24 * 60 * 60 * 1000;
    return assignments.filter((assignment) => {
      if (!assignment?.dueDate) return false;
      try {
        const due = new Date(assignment.dueDate).getTime();
        return Number.isFinite(due) && due - lastSyncTime <= weekInMs && due >= lastSyncTime;
      } catch {
        return false;
      }
    }).length;
  }, [assignments, lastSyncTime]);

  const isNetworkError = error?.kind === 'network';
  const assignmentErrorMessage = isNetworkError
    ? 'API server unreachable. Check VITE_API_BASE_URL and API deployment.'
    : error?.message;

  return (
    <PageShell maxWidth="max-w-6xl">
      <PageHeader
        title="Assignments"
        description={
          isStudent
            ? 'Track your coursework and submit your work.'
            : 'Manage assignments and grade student submissions.'
        }
      >
        <div className="flex items-center gap-4">
          {!isStudent && (
            <select
              aria-label="Select assignment class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-white border border-slate-200 px-4 py-3 rounded-2xl font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-100 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            >
              {classOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          {canManageAssignments && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
            >
              <Plus size={20} />
              Create
            </button>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Published"
          value={String(assignments.length)}
          detail={`Class ${selectedClass}`}
          icon={FileText}
          tone="blue"
        />
        <StatCard
          title={isStudent ? 'Submitted' : 'Submissions'}
          value={String(isStudent ? submittedCount : submissions.length)}
          detail={isStudent ? 'Completed by you' : 'For selected assignment'}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          title="Due Soon"
          value={String(dueSoonCount)}
          detail="Within the next week"
          icon={Clock}
          tone="cyan"
        />
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search assignments by title, class, or description..."
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {canManageAssignments && (
            <div className="mb-6 flex items-center justify-between rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3">
              <p className="text-xs font-bold text-violet-700">
                Last synced: {formatDistanceToNow(lastSyncTime, { addSuffix: true })}
              </p>
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-600">
                Realtime enabled
              </span>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 p-8 rounded-3xl text-center flex flex-col items-center gap-4 dark:border-red-900/60 dark:bg-red-950/30">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm dark:bg-slate-950">
                <AlertCircle size={32} />
              </div>
              <p className="text-red-700 font-medium dark:text-red-200">{assignmentErrorMessage}</p>
              {isNetworkError && (
                <p className="max-w-md rounded-xl bg-white/70 px-3 py-2 text-xs font-medium text-red-700 dark:bg-slate-950/70 dark:text-red-200">
                  Configured API base URL:{' '}
                  <code className="break-all font-mono">{getApiBaseUrlDiagnostic()}</code>
                </p>
              )}
              <p className="max-w-md text-sm text-red-700 dark:text-red-300">
                The assignment list is still safe to retry. Empty classes will show an empty state
                instead of crashing.
              </p>
              <button
                onClick={() => void loadAssignments()}
                className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No assignments found"
              description="Try a different search term or create a new assignment for this class."
            />
          ) : (
            <div className="grid gap-4">
              {filteredAssignments.map((assignment) => {
                if (!assignment || !assignment.id) return null;
                const mySub = mySubmissions[assignment.id];
                const display = assignment as AssignmentDisplay;
                const classes =
                  display.targetClasses ||
                  display.classIds ||
                  (assignment.classId ? [assignment.classId] : []);
                const subject =
                  display.subject || display.subjectId || display.subject_id || 'General';
                const submissionCount = display.submissionCount ?? display.submissionsCount ?? 0;
                return (
                  <motion.div
                    key={assignment.id}
                    layoutId={assignment.id}
                    onClick={() => setSelectedAssignment(assignment)}
                    className={cn(
                      'bg-white p-6 rounded-3xl border transition-all cursor-pointer group dark:bg-slate-900',
                      selectedAssignment?.id === assignment.id
                        ? 'border-blue-500 shadow-xl shadow-blue-50'
                        : 'border-slate-100 hover:border-blue-200 shadow-sm dark:border-slate-800'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors dark:text-white">
                            {assignment.title || 'Untitled Assignment'}
                          </h3>
                          {isStudent && mySub && (
                            <span
                              className={cn(
                                'text-[10px] font-black uppercase px-2 py-0.5 rounded-full',
                                mySub.status === 'graded'
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-blue-50 text-blue-600'
                              )}
                            >
                              {mySub.status}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-widest dark:text-slate-500">
                          <span className="flex items-center gap-1">
                            <CalendarIcon size={12} /> Due {assignment.dueDate || 'TBD'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={12} /> {classes.length ? classes.join(', ') : 'All'}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {subject}
                          </span>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
                            {submissionCount} submissions
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={20}
                        className="text-slate-300 group-hover:text-blue-500 transition-all"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {!selectedAssignment ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-50 border border-slate-100 p-8 rounded-3xl text-center flex flex-col items-center gap-4 h-full min-h-[400px] justify-center"
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-200 shadow-sm">
                  <GraduationCap size={32} />
                </div>
                <p className="text-slate-500 font-medium max-w-[200px]">
                  Select an assignment to view details and{' '}
                  {isStudent ? 'submit work' : 'grade submissions'}.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedAssignment.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-8 rounded-3xl border border-slate-100 shadow-lg space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedAssignment.title || 'Untitled Assignment'}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed dark:text-slate-400">
                    {selectedAssignment.description || 'No description provided.'}
                  </p>
                  {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
                    <div className="pt-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                        Worksheet / Reference File
                      </span>
                      {selectedAssignment.attachments.map((attachment, i) => {
                        const href = attachment.url;
                        return (
                          <a
                            key={i}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-xs text-blue-600 font-bold hover:underline"
                          >
                            <ExternalLink size={12} /> Download Reference File{' '}
                            {selectedAssignment.attachments.length > 1 ? i + 1 : ''}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>

                {isStudent ? (
                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    {mySubmissions[selectedAssignment.id] ? (
                      <div className="space-y-4">
                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">
                            My Submission
                          </p>
                          <p className="text-sm text-emerald-800">
                            {mySubmissions[selectedAssignment.id].content}
                          </p>
                          {mySubmissions[selectedAssignment.id].attachments[0]?.url && (
                            <a
                              href={mySubmissions[selectedAssignment.id].attachments[0].url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-xs text-blue-600 font-bold mt-2"
                            >
                              <ExternalLink size={12} /> View Attached File
                            </a>
                          )}
                        </div>

                        {mySubmissions[selectedAssignment.id].checkedByAI && (
                          <div
                            className={cn(
                              'p-6 rounded-2xl border',
                              mySubmissions[selectedAssignment.id].recheckedByTeacher
                                ? 'bg-indigo-600 text-white border-indigo-700'
                                : 'bg-blue-600 text-white border-blue-700'
                            )}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <p className="text-xs font-bold uppercase opacity-60 mb-1">
                                  {mySubmissions[selectedAssignment.id].recheckedByTeacher
                                    ? 'Final Teacher Grade'
                                    : 'AI Suggested Grade'}
                                </p>
                                <p className="text-3xl font-black">
                                  {mySubmissions[selectedAssignment.id].grade}
                                </p>
                              </div>
                              {mySubmissions[selectedAssignment.id].recheckedByTeacher && (
                                <span className="bg-white/20 px-2 py-1 rounded-lg text-[10px] font-bold uppercase backdrop-blur-sm">
                                  Verified
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium italic opacity-90">
                              &quot;{mySubmissions[selectedAssignment.id].feedback}&quot;
                            </p>

                            {!mySubmissions[selectedAssignment.id].recheckedByTeacher && (
                              <p className="text-[10px] mt-4 opacity-50 flex items-center gap-1">
                                <AlertCircle size={10} /> Pending teacher verification
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            Your Answer
                          </label>
                          <textarea
                            aria-label="Assignment submission answer"
                            rows={5}
                            placeholder="Type your submission here..."
                            value={submissionContent}
                            disabled={isSubmitting}
                            onChange={(e) => setSubmissionContent(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none transition-all disabled:opacity-50"
                          />
                        </div>

                        <div className="space-y-2">
                          {uid && selectedAssignment.id && (
                            <FileUpload
                              label="Attach File / Screenshot"
                              path={`submissions/${selectedAssignment.id}/${uid}`}
                              onUploadComplete={(url) => setSubmissionFileUrl(url)}
                            />
                          )}
                        </div>

                        <button
                          onClick={() => submitAssignment(selectedAssignment.id)}
                          disabled={isSubmitting || !submissionContent}
                          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:shadow-none"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{' '}
                              Analyzing with AI...
                            </>
                          ) : (
                            <>
                              <Send size={18} /> Submit Work
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 pt-4 border-t border-slate-50">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <Users size={18} className="text-blue-600" />
                      Submissions ({submissions.length})
                    </h4>

                    {submissionsLoading ? (
                      <div className="flex justify-center py-10">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {submissions.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">No submissions yet.</p>
                        ) : (
                          submissions.map((sub) => (
                            <div
                              key={sub.studentId}
                              className="bg-slate-50 p-4 rounded-2xl space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-bold text-slate-900 text-sm">
                                    {sub.studentName}
                                  </p>
                                  <div className="flex gap-1 mt-1">
                                    {sub.checkedByAI && (
                                      <span className="bg-blue-100 text-blue-600 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                        AI Score: {sub.aiScore}
                                      </span>
                                    )}
                                    {sub.recheckedByTeacher && (
                                      <span className="bg-indigo-100 text-indigo-600 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md">
                                        Verified
                                      </span>
                                    )}
                                  </div>
                                  <span
                                    className={cn(
                                      'text-[10px] font-black uppercase px-2 py-0.5 rounded-full',
                                      sub.status === 'graded'
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : 'bg-blue-50 text-blue-600'
                                    )}
                                  >
                                    {sub.status}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 line-clamp-2 italic">
                                  &quot;{sub.content}&quot;
                                </p>
                              </div>

                              {gradingState?.studentId === sub.studentId ? (
                                <div className="pt-4 space-y-3 border-t border-slate-200 mt-2">
                                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                                    <p className="text-[10px] font-black text-blue-600 uppercase mb-1">
                                      AI Draft Analysis
                                    </p>
                                    <p className="text-sm font-bold text-blue-900">
                                      Score: {sub.aiScore}
                                    </p>
                                    <p className="text-xs text-blue-800 mt-1 italic">
                                      &quot;{sub.aiFeedback}&quot;
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                                      Final Grade to Publish
                                    </label>
                                    <input
                                      aria-label="Final grade to publish"
                                      placeholder="e.g. 8.5"
                                      defaultValue={sub.grade || ''}
                                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 font-bold"
                                      onChange={(e) =>
                                        setGradingState({
                                          ...gradingState!,
                                          studentId: sub.studentId,
                                          grade: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                                      Final Teacher Feedback
                                    </label>
                                    <textarea
                                      aria-label="Final teacher feedback"
                                      rows={3}
                                      placeholder="Enter final feedback to publish to student..."
                                      defaultValue={sub.feedback || ''}
                                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                      onChange={(e) =>
                                        setGradingState({
                                          ...gradingState!,
                                          studentId: sub.studentId,
                                          feedback: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="flex gap-2 pt-2">
                                    <button
                                      onClick={handleGrade}
                                      className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-colors"
                                    >
                                      Publish to Student
                                    </button>
                                    <button
                                      onClick={() => setGradingState(null)}
                                      className="px-4 bg-slate-200 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-300 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() =>
                                    setGradingState({
                                      studentId: sub.studentId,
                                      grade: sub.grade || sub.aiScore?.toString() || '',
                                      feedback: sub.feedback || sub.aiFeedback || '',
                                    })
                                  }
                                  className="w-full text-xs font-bold text-indigo-600 hover:text-indigo-700 text-left flex items-center gap-1 group/btn mt-2 bg-indigo-50 p-2 rounded-lg"
                                >
                                  {sub.recheckedByTeacher
                                    ? 'Edit Published Grade'
                                    : sub.checkedByAI
                                      ? 'Review AI Draft & Publish'
                                      : 'Grade Submission manually'}
                                  <ChevronRight
                                    size={12}
                                    className="group-hover/btn:translate-x-0.5 transition-transform"
                                  />
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[100]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-8 space-y-6 dark:bg-slate-900 dark:border dark:border-slate-800 dark:text-slate-50"
            >
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                Create Assignment
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Title
                  </label>
                  <input
                    aria-label="Assignment title"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Description
                  </label>
                  <textarea
                    aria-label="Assignment description"
                    rows={4}
                    value={newAssignment.description}
                    onChange={(e) =>
                      setNewAssignment({ ...newAssignment, description: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Subject
                  </label>
                  <input
                    aria-label="Assignment subject"
                    value={newAssignment.subject}
                    onChange={(e) =>
                      setNewAssignment({ ...newAssignment, subject: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Due Date
                    </label>
                    <input
                      aria-label="Assignment due date"
                      type="date"
                      value={newAssignment.dueDate}
                      onChange={(e) =>
                        setNewAssignment({ ...newAssignment, dueDate: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Class
                    </label>
                    <select
                      aria-label="Assignment class"
                      value={newAssignment.classId}
                      onChange={(e) =>
                        setNewAssignment({ ...newAssignment, classId: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      {classOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <FileUpload
                  label="Attach worksheet or reference file"
                  path={`assignments/${newAssignment.classId}`}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                  onUploadComplete={setAssignmentAttachmentUrl}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreate}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all"
                >
                  Create Assignment
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};
