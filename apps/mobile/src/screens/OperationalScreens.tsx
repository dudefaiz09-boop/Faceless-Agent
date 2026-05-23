import React, { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { AttendanceRecord } from '@educonnect/shared';
import {
  assignmentsService,
  attendanceService,
  feesService,
  libraryService,
  performanceService,
  studentsService,
} from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';
import { colors, formatCurrency } from '../theme';
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  ModuleHeader,
  Pill,
  SearchInput,
  StatCard,
} from '../components/ModuleUi';

type FeeRecord = {
  id: string;
  studentId: string;
  amountDue: number;
  amountPaid?: number;
  dueDate?: string;
  status?: 'pending' | 'paid' | 'partial';
};

type PaymentRecord = {
  id: string;
  feeId: string;
  amount: number;
  paidAt?: string;
  method?: string;
  receiptUrl?: string;
};

type FeeAccountResponse = {
  fees?: FeeRecord[];
  payments?: PaymentRecord[];
};

type FeeReport = {
  totalPaid: number;
  pending: number;
  totalDue: number;
  records: FeeRecord[];
};

type LibraryResource = {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  grade?: string;
  type?: string;
  tags?: string[];
  fileUrl?: string;
  externalUrl?: string;
};

type BorrowRecord = {
  id: string;
  resourceId: string;
  studentName?: string;
  borrowedAt?: string;
  dueAt?: string;
  status?: 'borrowed' | 'returned';
};

type BorrowDueState = {
  label: string;
  tone: 'green' | 'amber' | 'red';
};

type PerformanceRecord = {
  id: string;
  subject: string;
  term: string;
  score: number;
  grade: string;
  studentId?: string;
};

type PerformanceReport = {
  classAverage: number;
  topSubject: string;
  globalRank?: number;
  records: PerformanceRecord[];
};

type StudentProfile = {
  uid: string;
  displayName?: string;
  email?: string;
  classId?: string;
  section?: string;
};

type ParentAssignmentSummary = {
  id: string;
  title: string;
  dueDate?: string;
};

type ParentSubmissionSummary = {
  id: string;
  assignmentId?: string;
  status?: string;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getBorrowDueState(record?: BorrowRecord): BorrowDueState | null {
  if (!record || record.status !== 'borrowed') return null;

  const dueAt = parseDate(record.dueAt);
  if (!dueAt) return { label: 'Borrowed', tone: 'amber' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(dueAt);
  dueDate.setHours(0, 0, 0, 0);

  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000);

  if (daysUntilDue < 0) {
    const overdueDays = Math.abs(daysUntilDue);
    return {
      label: `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`,
      tone: 'red',
    };
  }

  if (daysUntilDue === 0) return { label: 'Due today', tone: 'amber' };
  if (daysUntilDue <= 2) return { label: `Due in ${daysUntilDue} days`, tone: 'amber' };

  return { label: `Due in ${daysUntilDue} days`, tone: 'green' };
}

function loadParentAssignments(classId: string) {
  const assignments = assignmentsService.getAssignments(classId);
  return assignments as unknown as Promise<ParentAssignmentSummary[]>;
}

function loadParentSubmissions(studentId: string) {
  const submissions = assignmentsService.getMyHistory(studentId);
  return submissions as unknown as Promise<ParentSubmissionSummary[]>;
}

function useApiData<T>(key: unknown[], loader: () => Promise<T>, enabled = true) {
  return useQuery({
    queryKey: key,
    queryFn: loader,
    enabled,
    retry: 1,
  });
}

export function AttendanceScreen() {
  const { user, canManageAttendance, classId } = useAuth();
  const [mode, setMode] = useState<'history' | 'class'>(canManageAttendance ? 'class' : 'history');
  const selectedClass = classId || '10A';
  const selectedDate = todayIso();

  const query = useApiData<AttendanceRecord[]>(
    ['mobile-attendance', mode, user?.uid, selectedClass, selectedDate],
    () =>
      mode === 'class' && canManageAttendance
        ? (attendanceService.list(selectedClass, selectedDate) as Promise<AttendanceRecord[]>)
        : (attendanceService.history(user!.uid) as Promise<AttendanceRecord[]>),
    Boolean(user?.uid)
  );

  const records = query.data || [];
  const present = records.filter((item) => item.status === 'present').length;
  const absent = records.filter((item) => item.status === 'absent').length;
  const late = records.filter((item) => item.status === 'late').length;

  return (
    <View style={styles.flex}>
      <ModuleHeader
        title="Attendance"
        subtitle={
          canManageAttendance
            ? 'Daily class records and student attendance history.'
            : 'Your attendance history and current status.'
        }
      />
      {canManageAttendance && (
        <View style={styles.segmentRow}>
          {[
            ['class', 'Class Today'],
            ['history', 'My History'],
          ].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setMode(key as 'history' | 'class')}
              style={[styles.segmentButton, mode === key && styles.segmentButtonActive]}
            >
              <Text style={[styles.segmentText, mode === key && styles.segmentTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.statGrid}>
        <StatCard title="Present" value={String(present)} detail="Loaded records" tone="green" />
        <StatCard title="Late" value={String(late)} detail="Needs follow-up" tone="amber" />
        <StatCard title="Absent" value={String(absent)} detail="Not present" tone="red" />
      </View>
      {query.isLoading ? (
        <LoadingState title="Syncing attendance" />
      ) : query.isError ? (
        <ErrorState
          message={errorMessage(query.error, 'Attendance is temporarily unavailable.')}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item, index) => item.id || `${item.studentId}-${item.date}-${index}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="No attendance records"
              body="Records will appear here after they are marked."
              action={{ label: 'Refresh attendance', onPress: () => void query.refetch() }}
            />
          }
          refreshControl={
            <RefreshControl
              tintColor={colors.ai}
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
            />
          }
          renderItem={({ item }) => (
            <Card>
              <Pill
                label={item.status}
                tone={
                  item.status === 'present' ? 'green' : item.status === 'late' ? 'amber' : 'red'
                }
              />
              <Text style={styles.cardTitle}>{item.date || selectedDate}</Text>
              <Text style={styles.cardContent}>Student: {item.studentId}</Text>
              <Text style={styles.cardDate}>Class {item.classId || selectedClass}</Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

export function FeesScreen() {
  const { user, isStudent, canManageFees, classId } = useAuth();
  const selectedClass = classId || '10A';
  const query = useApiData<FeeAccountResponse | FeeReport>(
    ['mobile-fees', user?.uid, isStudent, canManageFees, selectedClass],
    () =>
      isStudent
        ? (feesService.getStudentAccount(user!.uid) as Promise<FeeAccountResponse>)
        : (feesService.getClassReport(selectedClass) as Promise<FeeReport>),
    Boolean(user?.uid) && (isStudent || canManageFees)
  );

  const account = query.data as FeeAccountResponse | undefined;
  const report = query.data as FeeReport | undefined;
  const fees = isStudent ? account?.fees || [] : report?.records || [];
  const paid = isStudent
    ? fees.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0)
    : Number(report?.totalPaid || 0);
  const due = isStudent
    ? fees.reduce(
        (sum, item) =>
          sum + Math.max(Number(item.amountDue || 0) - Number(item.amountPaid || 0), 0),
        0
      )
    : Number(report?.pending || 0);

  return (
    <View style={styles.flex}>
      <ModuleHeader
        title="Financial Management"
        subtitle={
          isStudent
            ? 'Your fee status and payment history.'
            : 'Read-only mobile fee summaries for permitted finance roles.'
        }
      />
      {!isStudent && !canManageFees ? (
        <EmptyState
          title="Fees unavailable"
          body="Your role can view this module only when fee access is granted."
        />
      ) : query.isLoading ? (
        <LoadingState title="Loading fee records" />
      ) : query.isError ? (
        <ErrorState
          message={errorMessage(query.error, 'Fee records are temporarily unavailable.')}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <FlatList
          data={fees}
          keyExtractor={(item, index) => item.id || `${item.studentId}-${index}`}
          ListHeaderComponent={
            <View style={styles.statGrid}>
              <StatCard
                title="Paid"
                value={formatCurrency(paid)}
                detail="Recorded payments"
                tone="green"
              />
              <StatCard title="Due" value={formatCurrency(due)} detail="Outstanding" tone="red" />
            </View>
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="No fee records"
              body="Fee entries will appear after accounts publishes them."
              action={{ label: 'Refresh fees', onPress: () => void query.refetch() }}
            />
          }
          refreshControl={
            <RefreshControl
              tintColor={colors.ai}
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
            />
          }
          renderItem={({ item }) => (
            <Card>
              <Pill
                label={item.status || 'pending'}
                tone={item.status === 'paid' ? 'green' : 'amber'}
              />
              <Text style={styles.cardTitle}>{formatCurrency(item.amountDue || 0)}</Text>
              <Text style={styles.cardContent}>Paid {formatCurrency(item.amountPaid || 0)}</Text>
              <Text style={styles.cardDate}>
                Due {item.dueDate || 'not set'} - Student {item.studentId}
              </Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

export function LibraryScreen() {
  const { user, isStudent, canManageLibrary } = useAuth();
  const [queryText, setQueryText] = useState('');
  const resourcesQuery = useApiData<LibraryResource[]>(
    ['mobile-library-resources'],
    () => libraryService.resources() as Promise<LibraryResource[]>
  );
  const historyQuery = useApiData<BorrowRecord[]>(
    ['mobile-library-history', user?.uid],
    () => libraryService.borrowHistory(user!.uid) as Promise<BorrowRecord[]>,
    Boolean(user?.uid && isStudent)
  );
  const resources = useMemo(() => {
    const normalized = queryText.trim().toLowerCase();
    return (resourcesQuery.data || []).filter((resource) => {
      if (!normalized) return true;
      return `${resource.title || ''} ${resource.subject || ''} ${(resource.tags || []).join(' ')}`
        .toLowerCase()
        .includes(normalized);
    });
  }, [queryText, resourcesQuery.data]);
  const activeBorrows = (historyQuery.data || []).filter((item) => item.status === 'borrowed');
  const overdueBorrows = activeBorrows.filter((item) => getBorrowDueState(item)?.tone === 'red');

  return (
    <View style={styles.flex}>
      <ModuleHeader
        title="Academic Library"
        subtitle="Digital resources, subjects, and borrowing status."
      >
        {canManageLibrary && <Pill label="manager" tone="violet" />}
      </ModuleHeader>
      <SearchInput
        value={queryText}
        onChangeText={setQueryText}
        placeholder="Search title, subject, or tag"
      />
      {resourcesQuery.isLoading ? (
        <LoadingState title="Loading library catalog" />
      ) : resourcesQuery.isError ? (
        <ErrorState
          message={errorMessage(resourcesQuery.error, 'Library resources are unavailable.')}
          onRetry={() => void resourcesQuery.refetch()}
        />
      ) : (
        <FlatList
          data={resources}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.statGrid}>
              <StatCard
                title="Catalog"
                value={String(resourcesQuery.data?.length || 0)}
                detail="Resources"
              />
              <StatCard
                title="Borrowed"
                value={String(activeBorrows.length)}
                detail="Active checkouts"
                tone="amber"
              />
              <StatCard
                title="Overdue"
                value={String(overdueBorrows.length)}
                detail="Needs return"
                tone="red"
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="No resources found"
              body="Try another search or refresh the catalog."
              action={
                queryText
                  ? { label: 'Clear search', onPress: () => setQueryText('') }
                  : { label: 'Refresh catalog', onPress: () => void resourcesQuery.refetch() }
              }
            />
          }
          refreshControl={
            <RefreshControl
              tintColor={colors.ai}
              refreshing={resourcesQuery.isRefetching || historyQuery.isRefetching}
              onRefresh={() => {
                void resourcesQuery.refetch();
                void historyQuery.refetch();
              }}
            />
          }
          renderItem={({ item }) => {
            const borrow = activeBorrows.find((record) => record.resourceId === item.id);
            const dueState = getBorrowDueState(borrow);

            return (
              <Card>
                <View style={styles.cardPillRow}>
                  <Pill label={item.subject || item.type || 'resource'} />
                  {dueState && <Pill label={dueState.label} tone={dueState.tone} />}
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardContent}>
                  {item.description || 'No description provided.'}
                </Text>
                <Text style={styles.cardDate}>
                  Grade {item.grade || 'All'} -{' '}
                  {(item.tags || []).slice(0, 3).join(', ') || 'No tags'}
                </Text>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

export function PerformanceScreen() {
  const { user, isStudent, canManagePerformance, classId } = useAuth();
  const selectedClass = classId || '10A';
  const query = useApiData<PerformanceRecord[] | PerformanceReport>(
    ['mobile-performance', user?.uid, isStudent, selectedClass],
    () =>
      isStudent
        ? (performanceService.student(user!.uid) as Promise<PerformanceRecord[]>)
        : (performanceService.report(selectedClass) as Promise<PerformanceReport>),
    Boolean(user?.uid) && (isStudent || canManagePerformance)
  );
  const report = query.data as PerformanceReport | undefined;
  const records = isStudent ? ((query.data || []) as PerformanceRecord[]) : report?.records || [];
  const average =
    records.length > 0
      ? Math.round(records.reduce((sum, item) => sum + Number(item.score || 0), 0) / records.length)
      : Math.round(report?.classAverage || 0);
  const topScore = Math.max(...records.map((item) => Number(item.score || 0)), 0);

  return (
    <View style={styles.flex}>
      <ModuleHeader
        title="Performance Analytics"
        subtitle="Academic records and mobile-safe score summaries."
      />
      {!isStudent && !canManagePerformance ? (
        <EmptyState
          title="Performance unavailable"
          body="Your role needs reporting access for this module."
        />
      ) : query.isLoading ? (
        <LoadingState title="Loading performance records" />
      ) : query.isError ? (
        <ErrorState
          message={errorMessage(query.error, 'Performance records are unavailable.')}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item, index) => item.id || `${item.studentId}-${item.subject}-${index}`}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.statGrid}>
              <StatCard
                title="Average"
                value={`${average}%`}
                detail="Loaded records"
                tone="violet"
              />
              <StatCard
                title="Top"
                value={`${topScore}%`}
                detail={report?.topSubject || 'Best score'}
                tone="green"
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="No performance records"
              body="Scores will appear after they are uploaded."
              action={{ label: 'Refresh scores', onPress: () => void query.refetch() }}
            />
          }
          refreshControl={
            <RefreshControl
              tintColor={colors.ai}
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
            />
          }
          renderItem={({ item }) => (
            <Card>
              <Pill
                label={item.grade || 'score'}
                tone={
                  Number(item.score) >= 80 ? 'green' : Number(item.score) >= 60 ? 'amber' : 'red'
                }
              />
              <Text style={styles.cardTitle}>{item.subject}</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(Math.max(Number(item.score || 0), 0), 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.cardContent}>
                {item.score}% - {item.term}
              </Text>
              {!isStudent && <Text style={styles.cardDate}>Student {item.studentId}</Text>}
            </Card>
          )}
        />
      )}
    </View>
  );
}

export function ParentPortalScreen() {
  const { role, linkedStudentIds } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState(linkedStudentIds[0] || '');

  const query = useApiData(
    ['mobile-parent-portal', selectedStudentId],
    async () => {
      const profileResponse = (await studentsService.getProfile(selectedStudentId)) as
        | StudentProfile
        | { data?: StudentProfile };

      const profile = (
        'data' in profileResponse && profileResponse.data ? profileResponse.data : profileResponse
      ) as StudentProfile;
      const assignmentRequest = profile.classId
        ? loadParentAssignments(profile.classId)
        : Promise.resolve<ParentAssignmentSummary[]>([]);

      const [attendance, fees, performance, assignments, submissions] = await Promise.all([
        attendanceService.history(selectedStudentId) as Promise<AttendanceRecord[]>,
        feesService.getStudentAccount(selectedStudentId) as Promise<FeeAccountResponse>,
        performanceService.student(selectedStudentId) as Promise<PerformanceRecord[]>,
        assignmentRequest,
        loadParentSubmissions(selectedStudentId),
      ]);
      return { profile, attendance, fees, performance, assignments, submissions };
    },
    Boolean(selectedStudentId)
  );

  const data = query.data;
  const attendanceRate = data?.attendance?.length
    ? Math.round(
        (data.attendance.filter((item) => item.status === 'present').length /
          data.attendance.length) *
          100
      )
    : 0;
  const avgScore = data?.performance?.length
    ? Math.round(
        data.performance.reduce((sum, item) => sum + Number(item.score || 0), 0) /
          data.performance.length
      )
    : 0;
  const pendingFees =
    data?.fees?.fees?.reduce(
      (sum, fee) => sum + Math.max(Number(fee.amountDue || 0) - Number(fee.amountPaid || 0), 0),
      0
    ) || 0;
  const pendingAssignments =
    data?.assignments?.length && data.submissions
      ? Math.max(data.assignments.length - data.submissions.length, 0)
      : 0;

  if (role === 'admin') {
    return (
      <ScrollView contentContainerStyle={styles.listContent}>
        <ModuleHeader
          title="Parent Portal"
          subtitle="Child-specific academic and finance summaries."
        />
        <EmptyState
          title="Admin view"
          body="Parent Portal is optimized for parent accounts. Use Students to manage student-parent links."
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          tintColor={colors.ai}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
        />
      }
    >
      <ModuleHeader
        title="Parent Portal"
        subtitle="Linked children, attendance, assignments, fees, and grades."
      />
      {linkedStudentIds.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalTabs}>
          {linkedStudentIds.map((id) => (
            <TouchableOpacity
              key={id}
              onPress={() => setSelectedStudentId(id)}
              style={[styles.segmentButton, selectedStudentId === id && styles.segmentButtonActive]}
            >
              <Text
                style={[styles.segmentText, selectedStudentId === id && styles.segmentTextActive]}
              >
                {id.slice(0, 8)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {!selectedStudentId ? (
        <EmptyState
          title="No students linked"
          body="Ask the school administration to link your parent account."
        />
      ) : query.isLoading ? (
        <LoadingState title="Syncing dependent records" />
      ) : query.isError ? (
        <ErrorState
          message={errorMessage(query.error, 'Parent portal data is unavailable.')}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <Card style={styles.profileCard}>
            <Pill label="student profile" />
            <Text style={styles.heroName}>{data?.profile?.displayName || selectedStudentId}</Text>
            <Text style={styles.cardContent}>
              Class {data?.profile?.classId || 'N/A'} - Section {data?.profile?.section || 'N/A'}
            </Text>
          </Card>
          <View style={styles.statGrid}>
            <StatCard
              title="Attendance"
              value={`${attendanceRate}%`}
              detail="Present rate"
              tone="green"
            />
            <StatCard title="Average" value={`${avgScore}%`} detail="Performance" tone="violet" />
            <StatCard
              title="Pending"
              value={String(pendingAssignments)}
              detail="Assignments"
              tone="amber"
            />
            <StatCard
              title="Fees Due"
              value={formatCurrency(pendingFees)}
              detail="Outstanding"
              tone="red"
            />
          </View>
          <Card>
            <Text style={styles.cardTitle}>Recent attendance</Text>
            {(data?.attendance || []).slice(0, 5).map((item) => (
              <Text key={item.id || `${item.date}-${item.studentId}`} style={styles.rowText}>
                {item.date}: {item.status}
              </Text>
            ))}
            {(data?.attendance || []).length === 0 && (
              <Text style={styles.cardContent}>No attendance records are available yet.</Text>
            )}
          </Card>
          <Card>
            <Text style={styles.cardTitle}>Academic workflow</Text>
            {(data?.assignments || []).slice(0, 5).map((item) => (
              <Text key={item.id} style={styles.rowText}>
                {item.title} - due {item.dueDate}
              </Text>
            ))}
            {(data?.assignments || []).length === 0 && (
              <Text style={styles.cardContent}>No assignments are available for this child.</Text>
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

export function PlaceholderApiScreen({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <ScrollView contentContainerStyle={styles.listContent}>
      <ModuleHeader title={title} subtitle={subtitle} />
      <EmptyState
        title="Mobile API not implemented"
        body="The web module has planned backend actions, but no safe mobile contract was found. This screen stays connected and non-crashing."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    color: colors.whiteSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  cardDate: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 12,
  },
  cardPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  flex: {
    flex: 1,
  },
  heroName: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 8,
  },
  horizontalTabs: {
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  profileCard: {
    backgroundColor: '#312e81',
    borderColor: '#4f46e5',
  },
  progressFill: {
    backgroundColor: '#4f8cff',
    borderRadius: 999,
    height: 10,
  },
  progressTrack: {
    backgroundColor: colors.cardSoft,
    borderRadius: 999,
    height: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  rowText: {
    color: colors.whiteSoft,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
  },
  segmentButton: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: colors.text,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 2,
  },
});
