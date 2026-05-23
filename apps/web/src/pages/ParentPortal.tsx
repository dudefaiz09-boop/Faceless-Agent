import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { parentPortalService } from '../lib/api-client';
import {
  Baby,
  GraduationCap,
  Clock,
  AlertCircle,
  Calendar,
  CreditCard,
  FileText,
  TrendingUp,
  Users,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { PageShell } from '../components/ui/PageShell';
import {
  StudentProfile,
  AttendanceRecord,
  Assignment,
  Submission,
} from '@educonnect/shared-education';

type StudentProfileResponse = StudentProfile | { success?: boolean; data?: StudentProfile };

type FeeRecord = {
  id: string;
  studentId: string;
  amountDue: number;
  amountPaid?: number;
  dueDate: string;
  status?: 'pending' | 'paid' | 'partial';
};

type PaymentRecord = {
  id: string;
  feeId: string;
  amount: number;
  paidAt: string;
};

type FeeResponse = {
  fees?: FeeRecord[];
  payments?: PaymentRecord[];
};

type PerformanceRecord = {
  id: string;
  subject: string;
  term: string;
  score: number;
  grade: string;
};

function unwrapStudentProfile(response: StudentProfileResponse): StudentProfile {
  return 'data' in response && response.data ? response.data : (response as StudentProfile);
}

export const ParentPortal = () => {
  const { role, linkedStudentIds } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    linkedStudentIds[0] || null
  );
  const [studentData, setStudentData] = useState<StudentProfile | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (linkedStudentIds.length > 0 && !selectedStudentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedStudentId(linkedStudentIds[0]);
    }
  }, [linkedStudentIds, selectedStudentId]);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!selectedStudentId) return;
      setLoading(true);
      try {
        const profileResponse = (await parentPortalService.studentProfile(
          selectedStudentId,
        )) as StudentProfileResponse;
        const profile = unwrapStudentProfile(profileResponse);
        setStudentData(profile);

        const [att, feeData, performanceData, ass, subs] =
          (await parentPortalService.studentBundle(
            selectedStudentId,
            profile.classId,
          )) as [
            AttendanceRecord[],
            FeeResponse,
            PerformanceRecord[],
            Assignment[],
            Submission[],
          ];

        setAttendance(att);
        setFees(feeData.fees || []);
        setPayments(feeData.payments || []);
        setPerformance(performanceData || []);
        setAssignments(ass || []);

        const subMap: Record<string, Submission> = {};
        subs.forEach((s) => (subMap[s.assignmentId] = s));
        setSubmissions(subMap);
      } catch (err) {
        console.error('Failed to fetch parent portal data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [selectedStudentId]);

  const attendanceRate =
    attendance.length > 0
      ? Math.round(
          (attendance.filter((record) => record.status === 'present').length / attendance.length) *
            100
        )
      : 0;
  const pendingAssignments = Math.max(assignments.length - Object.keys(submissions).length, 0);
  const averageScore =
    performance.length > 0
      ? Math.round(
          performance.reduce((sum, record) => sum + Number(record.score || 0), 0) /
            performance.length
        )
      : 0;
  const pendingFees = fees.reduce(
    (sum, fee) => sum + Math.max(Number(fee.amountDue || 0) - Number(fee.amountPaid || 0), 0),
    0
  );

  if (role === 'admin') {
    return (
      <PageShell>
        <PageHeader
          title="Parent Portal"
          description="Monitoring academic progress for your children."
        />
        <div className="bg-white p-20 rounded-[40px] text-center border border-slate-100 shadow-sm">
          <AlertCircle size={48} className="mx-auto text-blue-600 mb-6" />
          <h3 className="text-xl font-bold text-slate-900">Admin View</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            The Parent Portal is optimized for parent accounts. As an administrator, please use the{' '}
            <span className="font-bold text-blue-600">Students</span> module to manage student
            records and parent-child links.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Parent Portal"
        description="Monitoring academic progress for your children."
      >
        <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
          {linkedStudentIds.map((id) => (
            <button
              key={id}
              onClick={() => setSelectedStudentId(id)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2',
                selectedStudentId === id
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
                  : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
              )}
            >
              <Baby size={16} />
              {id === selectedStudentId && studentData?.displayName
                ? studentData.displayName
                : `Student ${id.substring(0, 4)}`}
            </button>
          ))}
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
            Syncing Dependent Records...
          </p>
        </div>
      ) : !selectedStudentId ? (
        <div className="bg-white p-20 rounded-[40px] text-center border border-slate-100 shadow-sm">
          <AlertCircle size={48} className="mx-auto text-slate-200 mb-6" />
          <h3 className="text-xl font-bold text-slate-900">No students linked</h3>
          <p className="text-slate-500 mt-2">
            Please contact the administration to link your account to your children.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Summary & Attendance */}
          <div className="space-y-8">
            {/* Quick Profile Card */}
            <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-indigo-100 text-xs font-black uppercase tracking-widest mb-2">
                  Student Profile
                </p>
                <h2 className="text-3xl font-black">{studentData?.displayName}</h2>
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm font-bold bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                    <GraduationCap size={20} />
                    Class {studentData?.classId || 'N/A'} - Section {studentData?.section || 'N/A'}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                    <Users size={20} />
                    Roll No: {studentData?.uid.substring(0, 5).toUpperCase()}
                  </div>
                </div>
              </div>
              <Baby className="absolute -right-4 -bottom-4 w-40 h-40 text-white/5 rotate-12" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
                <Calendar size={20} className="text-emerald-500" />
                <p className="mt-4 text-2xl font-black text-slate-900">{attendanceRate}%</p>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Attendance
                </p>
              </div>
              <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
                <TrendingUp size={20} className="text-blue-600" />
                <p className="mt-4 text-2xl font-black text-slate-900">{averageScore}%</p>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Average
                </p>
              </div>
              <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
                <FileText size={20} className="text-orange-500" />
                <p className="mt-4 text-2xl font-black text-slate-900">{pendingAssignments}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Pending
                </p>
              </div>
              <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
                <CreditCard size={20} className="text-violet-600" />
                <p className="mt-4 text-2xl font-black text-slate-900">
                  ${Math.round(pendingFees)}
                </p>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Fee Due
                </p>
              </div>
            </div>

            {/* Attendance Snapshot */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-slate-900 flex items-center gap-2">
                  <Calendar size={20} className="text-emerald-500" />
                  Attendance
                </h3>
                <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase px-2 py-1 rounded-lg">
                  Realtime
                </span>
              </div>

              <div className="space-y-4">
                {attendance.slice(0, 5).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-500">{record.date}</p>
                      <p
                        className={cn(
                          'text-sm font-black uppercase tracking-widest',
                          record.status === 'present' ? 'text-emerald-600' : 'text-red-500'
                        )}
                      >
                        {record.status}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        record.status === 'present'
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-red-100 text-red-500'
                      )}
                    >
                      {record.status === 'present' ? (
                        <Clock size={18} />
                      ) : (
                        <AlertCircle size={18} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Assignments & Grades */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-slate-900 flex items-center gap-2">
                    <TrendingUp size={22} className="text-blue-600" />
                    Performance
                  </h3>
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase px-2 py-1 rounded-lg">
                    {performance.length} Records
                  </span>
                </div>
                <div className="space-y-3">
                  {performance.slice(0, 4).map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{record.subject}</p>
                        <p className="text-xs font-medium text-slate-400">{record.term}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-900">{record.score}%</p>
                        <p className="text-xs font-bold text-blue-600">{record.grade}</p>
                      </div>
                    </div>
                  ))}
                  {performance.length === 0 && (
                    <p className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-400">
                      No performance records are available yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-slate-900 flex items-center gap-2">
                    <CreditCard size={22} className="text-violet-600" />
                    Fees
                  </h3>
                  <span className="bg-violet-50 text-violet-600 text-[10px] font-black uppercase px-2 py-1 rounded-lg">
                    {payments.length} Payments
                  </span>
                </div>
                <div className="space-y-3">
                  {fees.slice(0, 4).map((fee) => {
                    const due = Math.max(
                      Number(fee.amountDue || 0) - Number(fee.amountPaid || 0),
                      0
                    );
                    return (
                      <div
                        key={fee.id}
                        className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
                      >
                        <div>
                          <p className="font-bold text-slate-900">Due {fee.dueDate}</p>
                          <p className="text-xs font-medium text-slate-400">
                            Paid ${fee.amountPaid || 0} of ${fee.amountDue || 0}
                          </p>
                        </div>
                        <div
                          className={cn(
                            'rounded-xl px-3 py-2 text-xs font-black uppercase',
                            due === 0
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-orange-50 text-orange-600'
                          )}
                        >
                          {due === 0 ? 'Paid' : `$${due} due`}
                        </div>
                      </div>
                    );
                  })}
                  {fees.length === 0 && (
                    <p className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-400">
                      No fee records are available yet.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-slate-900 flex items-center gap-2 text-xl">
                  <FileText size={24} className="text-blue-600" />
                  Academic Workflow
                </h3>
                <div className="flex gap-2">
                  <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-bold">
                    {assignments.length} Total
                  </div>
                  <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-lg text-xs font-bold">
                    {assignments.length - Object.keys(submissions).length} Pending
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {assignments.map((assignment) => {
                  const submission = submissions[assignment.id];
                  return (
                    <div
                      key={assignment.id}
                      className="group p-6 rounded-3xl border border-slate-100 hover:border-blue-100 transition-all bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-blue-900/5"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {assignment.title}
                          </h4>
                          <p className="text-xs text-slate-400 font-medium">
                            Due: {assignment.dueDate}
                          </p>
                        </div>
                        {submission ? (
                          <div
                            className={cn(
                              'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                              submission.status === 'graded'
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-blue-50 text-blue-600'
                            )}
                          >
                            {submission.status}
                          </div>
                        ) : (
                          <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-500">
                            Missing
                          </div>
                        )}
                      </div>

                      {submission?.status === 'graded' && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 mt-4 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              Grade Received
                            </p>
                            <p className="text-2xl font-black text-slate-900">{submission.grade}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              Feedback
                            </p>
                            <p className="text-sm text-slate-600 font-medium italic truncate max-w-[200px]">
                              &quot;{submission.feedback}&quot;
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};
