import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createHash } from 'node:crypto';

config({ path: '../../.env', quiet: true });
config({ quiet: true });

type SeedUser = {
  email: string;
  password: string;
  displayName: string;
  role: string;
  tenantId: string;
  isSuperAdmin?: boolean;
  managedTenantIds?: string[];
  classId?: string;
  classIds?: string[];
  linkedStudentIds?: string[];
  permissions: Record<string, boolean>;
  assignedModules?: string[];
  section?: string;
  subjects?: string[];
  studentId?: string;
  teacherId?: string;
  staffId?: string;
};

const dryRun = process.argv.includes('--dry-run');
const now = new Date().toISOString();
const demoPassword = 'Test@123456';
const activeDemoTenantIds = ['tenant-a', 'tenant-b'] as const;
const cleanupDemoTenantIds = [...activeDemoTenantIds, 'tenant-c'];
const demoEmailDomain = '@educonnect.test';
const staleDemoEmails = ['test@test.com'];
const staleDemoNames = ['TEST', 'Student Demo', 'Student A', 'Student B'];

// This script only cleans and regenerates known demo tenants/users. Never point these
// IDs or the @educonnect.test domain at real production schools.

function deterministicUuid(input: string) {
  const hash = createHash('sha256').update(input).digest('hex').slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

const tenants = [
  {
    id: 'tenant-a',
    name: 'EduConnect Demo Academy',
    slug: 'educonnect-demo-academy',
    metadata: { city: 'Pune', board: 'CBSE', academicYear: '2026-2027', timezone: 'Asia/Kolkata' },
  },
  {
    id: 'tenant-b',
    name: 'EduConnect International School',
    slug: 'educonnect-international-school',
    metadata: {
      city: 'Mumbai',
      board: 'ICSE',
      academicYear: '2026-2027',
      timezone: 'Asia/Kolkata',
    },
  },
];

const manageEverything = {
  manageUsers: true,
  manageRoles: true,
  manageModules: true,
  manageClasses: true,
  manageSubjects: true,
  manageTeachers: true,
  manageStudents: true,
  manageAnnouncements: true,
  manageAttendance: true,
  markAttendance: true,
  viewAttendance: true,
  manageAssignments: true,
  manageLibrary: true,
  manageFees: true,
  managePerformance: true,
  viewPerformance: true,
  viewStudentDetails: true,
  viewAuditLogs: true,
  useAI: true,
  createAnnouncements: true,
  viewReports: true,
  manageTenants: true,
  viewAllTenants: true,
  switchTenants: true,
  provisionAccess: true,
  manageSettings: true,
  manageSecurity: true,
};

const studentPermissions = {
  viewOwnRecords: true,
  viewAssignments: true,
  viewAttendance: true,
  viewFees: true,
  submitAssignments: true,
};

const teacherPermissions = {
  viewStudents: true,
  viewAssignments: true,
  manageAssignments: true,
  viewAttendance: true,
  markAttendance: true,
  viewReports: true,
  useAI: true,
  createAnnouncements: true,
};

const modulesByRole: Record<string, string[]> = {
  admin: [
    'dashboard',
    'aiAssistant',
    'announcements',
    'attendance',
    'assignments',
    'chat',
    'library',
    'fees',
    'performance',
    'students',
    'teachers',
    'allUsers',
    'parentPortal',
    'auditLogs',
    'settings',
  ],
  principal: [
    'dashboard',
    'announcements',
    'attendance',
    'assignments',
    'chat',
    'library',
    'fees',
    'performance',
    'students',
    'teachers',
    'auditLogs',
  ],
  teacher: [
    'dashboard',
    'aiAssistant',
    'announcements',
    'attendance',
    'assignments',
    'chat',
    'library',
    'performance',
    'students',
  ],
  student: [
    'dashboard',
    'aiAssistant',
    'announcements',
    'attendance',
    'assignments',
    'chat',
    'library',
    'fees',
    'performance',
  ],
  parent: [
    'dashboard',
    'announcements',
    'attendance',
    'assignments',
    'chat',
    'fees',
    'performance',
    'parentPortal',
  ],
  librarian: ['dashboard', 'announcements', 'chat', 'library'],
  accountant: ['dashboard', 'announcements', 'chat', 'fees'],
  staff: ['dashboard', 'announcements', 'attendance', 'chat', 'students'],
};

const seedUsers: SeedUser[] = [
  // Tenant A
  {
    email: 'admin.demo1@educonnect.test',
    password: demoPassword,
    role: 'admin',
    tenantId: 'tenant-a',
    staffId: 'adm-a-001',
    displayName: 'Demo Academy Admin',
    permissions: manageEverything,
  },
  {
    email: 'student.a.demo1@educonnect.test',
    password: demoPassword,
    role: 'student',
    tenantId: 'tenant-a',
    studentId: 'stu-a-001',
    displayName: 'Aarav Sharma',
    classId: 'A1',
    permissions: studentPermissions,
  },
  {
    email: 'student.b.demo1@educonnect.test',
    password: demoPassword,
    role: 'student',
    tenantId: 'tenant-a',
    studentId: 'stu-a-002',
    displayName: 'Ananya Patil',
    classId: 'A2',
    permissions: studentPermissions,
  },
  {
    email: 'teacher.math.demo1@educonnect.test',
    password: demoPassword,
    role: 'teacher',
    tenantId: 'tenant-a',
    teacherId: 'tch-a-001',
    displayName: 'Meera Iyer',
    classIds: ['A1', 'A2'],
    subjects: ['Mathematics', 'Science'],
    permissions: teacherPermissions,
  },
  {
    email: 'teacher.english.demo1@educonnect.test',
    password: demoPassword,
    role: 'teacher',
    tenantId: 'tenant-a',
    teacherId: 'tch-a-002',
    displayName: 'Rohan Deshmukh',
    classIds: ['A2'],
    subjects: ['English', 'History'],
    permissions: teacherPermissions,
  },
  {
    email: 'librarian.demo1@educonnect.test',
    password: demoPassword,
    role: 'librarian',
    tenantId: 'tenant-a',
    staffId: 'lib-a-001',
    displayName: 'Kavita Rao',
    permissions: { manageLibrary: true, viewStudents: true, viewAssignments: true },
  },
  {
    email: 'accountant.demo1@educonnect.test',
    password: demoPassword,
    role: 'accountant',
    tenantId: 'tenant-a',
    staffId: 'acc-a-001',
    displayName: 'Demo Academy Accountant',
    permissions: { manageFees: true, viewStudents: true, viewReports: true, viewFinancials: true },
  },
  {
    email: 'principal.demo1@educonnect.test',
    password: demoPassword,
    role: 'principal',
    tenantId: 'tenant-a',
    staffId: 'prn-a-001',
    displayName: 'Principal Nair',
    permissions: {
      ...teacherPermissions,
      manageStudents: true,
      manageTeachers: true,
      manageFees: true,
      viewFinancials: true,
      manageLibrary: true,
      manageUsers: true,
    },
  },
  {
    email: 'parent.a.demo1@educonnect.test',
    password: demoPassword,
    role: 'parent',
    tenantId: 'tenant-a',
    displayName: 'Parent A',
    linkedStudentIds: ['student.a.demo1@educonnect.test', 'student.b.demo1@educonnect.test'], // Will resolve to IDs
    permissions: studentPermissions,
  },

  // Tenant B
  {
    email: 'admin.demo2@educonnect.test',
    password: demoPassword,
    role: 'admin',
    tenantId: 'tenant-b',
    staffId: 'adm-b-001',
    displayName: 'International School Admin',
    permissions: manageEverything,
  },
  {
    email: 'student.a.demo2@educonnect.test',
    password: demoPassword,
    role: 'student',
    tenantId: 'tenant-b',
    studentId: 'stu-b-001',
    displayName: 'Kabir Khan',
    classId: 'B1',
    permissions: studentPermissions,
  },
  {
    email: 'student.b.demo2@educonnect.test',
    password: demoPassword,
    role: 'student',
    tenantId: 'tenant-b',
    studentId: 'stu-b-002',
    displayName: 'Diya Mehta',
    classId: 'B2',
    permissions: studentPermissions,
  },
  {
    email: 'teacher.math.demo2@educonnect.test',
    password: demoPassword,
    role: 'teacher',
    tenantId: 'tenant-b',
    teacherId: 'tch-b-001',
    displayName: 'Arjun Sen',
    classIds: ['B1', 'B2'],
    subjects: ['Mathematics', 'Computer Science'],
    permissions: teacherPermissions,
  },
  {
    email: 'librarian.demo2@educonnect.test',
    password: demoPassword,
    role: 'librarian',
    tenantId: 'tenant-b',
    staffId: 'lib-b-001',
    displayName: 'Farah Ali',
    permissions: { manageLibrary: true, viewStudents: true, viewAssignments: true },
  },
  {
    email: 'accountant.demo2@educonnect.test',
    password: demoPassword,
    role: 'accountant',
    tenantId: 'tenant-b',
    staffId: 'acc-b-001',
    displayName: 'International School Accountant',
    permissions: { manageFees: true, viewStudents: true, viewReports: true, viewFinancials: true },
  },
  {
    email: 'principal.demo2@educonnect.test',
    password: demoPassword,
    role: 'principal',
    tenantId: 'tenant-b',
    staffId: 'prn-b-001',
    displayName: 'Principal Kapoor',
    permissions: {
      ...teacherPermissions,
      manageStudents: true,
      manageTeachers: true,
      manageFees: true,
      viewFinancials: true,
      manageLibrary: true,
      manageUsers: true,
    },
  },
  {
    email: 'parent.a.demo2@educonnect.test',
    password: demoPassword,
    role: 'parent',
    tenantId: 'tenant-b',
    displayName: 'Parent B',
    linkedStudentIds: ['student.a.demo2@educonnect.test', 'student.b.demo2@educonnect.test'],
    permissions: studentPermissions,
  },

  // Global Admin
  {
    email: 'admin@educonnect.test',
    password: demoPassword,
    role: 'admin',
    tenantId: 'tenant-a',
    isSuperAdmin: true,
    managedTenantIds: [...activeDemoTenantIds],
    displayName: 'Global Admin',
    permissions: manageEverything,
  },
];

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function findUserByEmail(supabase: SupabaseClient, email: string) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) || null;
}

type CleanupResult = { error: { message: string } | null };

async function ignoreCleanupErrors(label: string, action: () => PromiseLike<CleanupResult>) {
  const { error } = await action();
  if (error) {
    console.warn(`Skipping cleanup for ${label}: ${error.message}`);
  }
}

async function cleanupKnownDemoData(supabase: SupabaseClient) {
  console.log('Cleaning known demo data for educonnect.test tenants...');

  const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (authListError) throw authListError;

  for (const user of authUsers.users) {
    const email = user.email?.toLowerCase() || '';
    if (email.endsWith(demoEmailDomain) || staleDemoEmails.includes(email)) {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) console.warn(`Could not delete demo auth user ${user.email}: ${error.message}`);
    }
  }

  await ignoreCleanupErrors('profiles', () =>
    supabase.from('profiles').delete().like('email', `%${demoEmailDomain}`)
  );
  await ignoreCleanupErrors('stale profiles', () =>
    supabase.from('profiles').delete().in('email', staleDemoEmails)
  );
  await ignoreCleanupErrors('user_tenants', () =>
    supabase.from('user_tenants').delete().like('email', `%${demoEmailDomain}`)
  );
  await ignoreCleanupErrors('stale user_tenants', () =>
    supabase.from('user_tenants').delete().in('email', staleDemoEmails)
  );

  const tenantScopedTables = ['attendance', 'assignments', 'fees', 'performance'];
  for (const table of tenantScopedTables) {
    await ignoreCleanupErrors(table, () =>
      supabase.from(table).delete().in('school_id', cleanupDemoTenantIds)
    );
  }

  await ignoreCleanupErrors('submissions', () =>
    supabase.from('submissions').delete().like('assignment_id', 'assign-%')
  );

  for (const tenantId of cleanupDemoTenantIds) {
    await ignoreCleanupErrors(`documents tenantId ${tenantId}`, () =>
      supabase.from('documents').delete().contains('data', { tenantId })
    );
    await ignoreCleanupErrors(`documents schoolId ${tenantId}`, () =>
      supabase.from('documents').delete().contains('data', { schoolId: tenantId })
    );
  }

  for (const email of staleDemoEmails) {
    await ignoreCleanupErrors(`documents stale email ${email}`, () =>
      supabase.from('documents').delete().contains('data', { email })
    );
  }
  for (const displayName of staleDemoNames) {
    await ignoreCleanupErrors(`documents stale displayName ${displayName}`, () =>
      supabase.from('documents').delete().contains('data', { displayName })
    );
  }

  await ignoreCleanupErrors('demo tenants', () =>
    supabase.from('tenants').delete().in('id', cleanupDemoTenantIds)
  );
}

async function upsertDocument(
  supabase: SupabaseClient,
  collection: string,
  id: string,
  tenantId: string,
  data: Record<string, unknown>
) {
  const { error } = await supabase.from('documents').upsert(
    {
      collection,
      id,
      data: {
        ...data,
        id,
        schoolId: tenantId,
        tenantId: tenantId,
        updatedAt: now,
      },
    },
    { onConflict: 'collection,id' }
  );

  if (error) throw error;
}

async function seedUser(
  supabase: SupabaseClient,
  seedUser: SeedUser,
  idsByEmail: Map<string, string>
) {
  const existingUser = await findUserByEmail(supabase, seedUser.email);
  const appMetadata = {
    role: seedUser.role,
    roles: [seedUser.role],
    isAdmin: seedUser.role === 'admin' || seedUser.isSuperAdmin,
    isSuperAdmin: seedUser.isSuperAdmin || false,
    schoolId: seedUser.tenantId,
    tenantId: seedUser.tenantId,
    managedTenantIds: seedUser.managedTenantIds || [seedUser.tenantId],
    classId: seedUser.classId || null,
    classIds: seedUser.classIds || (seedUser.classId ? [seedUser.classId] : []),
    permissions: seedUser.permissions,
    assignedModules: seedUser.assignedModules || modulesByRole[seedUser.role] || [],
    status: 'active',
  };

  const userMetadata = {
    display_name: seedUser.displayName,
  };

  const result = existingUser
    ? await supabase.auth.admin.updateUserById(existingUser.id, {
        password: seedUser.password,
        app_metadata: appMetadata,
        user_metadata: userMetadata,
      })
    : await supabase.auth.admin.createUser({
        email: seedUser.email,
        password: seedUser.password,
        email_confirm: true,
        app_metadata: appMetadata,
        user_metadata: userMetadata,
      });

  if (result.error) throw result.error;
  const user = result.data.user;

  if (!user) throw new Error(`Failed to upsert ${seedUser.email}`);
  idsByEmail.set(seedUser.email, user.id);

  const linkedStudentIds = (seedUser.linkedStudentIds || [])
    .map((email) => idsByEmail.get(email))
    .filter(Boolean);

  const profile = {
    id: user.id,
    school_id: seedUser.tenantId,
    email: seedUser.email,
    display_name: seedUser.displayName,
    role: seedUser.role,
    roles: [seedUser.role],
    is_super_admin: seedUser.isSuperAdmin || false,
    managed_tenant_ids: seedUser.managedTenantIds || [seedUser.tenantId],
    permissions: seedUser.permissions,
    class_ids: seedUser.classIds || (seedUser.classId ? [seedUser.classId] : []),
    linked_student_ids: linkedStudentIds,
    assigned_modules: seedUser.assignedModules || modulesByRole[seedUser.role] || [],
    status: 'active',
    updated_at: now,
  };

  const { error: profileError } = await supabase.from('profiles').upsert(profile);
  if (profileError) throw profileError;

  // Link to multiple tenants if super admin or specified
  const tenantIds = seedUser.managedTenantIds || [seedUser.tenantId];
  for (const tid of tenantIds) {
    await supabase.from('user_tenants').upsert(
      {
        user_id: user.id,
        email: seedUser.email,
        tenant_id: tid,
        role: seedUser.role,
        is_default: tid === seedUser.tenantId,
        is_active: true,
        updated_at: now,
      },
      { onConflict: 'email,tenant_id' }
    );
  }

  // Legacy document store
  await upsertDocument(supabase, 'users', user.id, seedUser.tenantId, {
    uid: user.id,
    email: seedUser.email,
    displayName: seedUser.displayName,
    role: seedUser.role,
    roles: [seedUser.role],
    isAdmin: seedUser.role === 'admin' || seedUser.isSuperAdmin,
    isSuperAdmin: seedUser.isSuperAdmin,
    schoolId: seedUser.tenantId,
    tenantId: seedUser.tenantId,
    managedTenantIds: tenantIds,
    classId: seedUser.classId || null,
    classIds: profile.class_ids,
    linkedStudentIds,
    permissions: seedUser.permissions,
    assignedModules: profile.assigned_modules,
    status: 'active',
    createdAt: user.created_at || now,
  });

  return user.id;
}

async function seedAttendance(supabase: SupabaseClient, idsByEmail: Map<string, string>) {
  const days = 7;
  const statuses = ['present', 'present', 'present', 'present', 'absent', 'late', 'present'];
  const attendanceDocuments = new Map<
    string,
    {
      tenantId: string;
      classId: string;
      date: string;
      records: Array<{ studentId: string; studentName: string; status: string }>;
    }
  >();

  const studentEmails = [
    'student.a.demo1@educonnect.test',
    'student.b.demo1@educonnect.test',
    'student.a.demo2@educonnect.test',
    'student.b.demo2@educonnect.test',
  ];

  for (const email of studentEmails) {
    const userId = idsByEmail.get(email);
    const user = seedUsers.find((u) => u.email === email);
    if (!userId || !user) continue;

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const status = statuses[(email.length + i) % statuses.length];

      const record = {
        student_id: userId,
        class_id: user.classId || 'default',
        school_id: user.tenantId,
        attendance_date: dateStr,
        status: status,
      };

      await supabase
        .from('attendance')
        .upsert(record, { onConflict: 'student_id,class_id,attendance_date' });

      const documentKey = `${user.tenantId}:${user.classId || 'default'}:${dateStr}`;
      const documentRecord = attendanceDocuments.get(documentKey) || {
        tenantId: user.tenantId,
        classId: user.classId || 'default',
        date: dateStr,
        records: [],
      };
      documentRecord.records.push({
        studentId: userId,
        studentName: user.displayName,
        status,
      });
      attendanceDocuments.set(documentKey, documentRecord);
    }
  }

  for (const attendance of attendanceDocuments.values()) {
    await upsertDocument(
      supabase,
      'attendance',
      `${attendance.classId}_${attendance.date}`,
      attendance.tenantId,
      attendance
    );
  }
}

async function seedAssignments(supabase: SupabaseClient, idsByEmail: Map<string, string>) {
  const assignmentData = [
    {
      id: 'assign-a-001',
      tenantId: 'tenant-a',
      title: 'Algebra Practice Worksheet',
      subject: 'Mathematics',
      classes: ['A1', 'A2'],
      teacher: 'teacher.math.demo1@educonnect.test',
    },
    {
      id: 'assign-a-002',
      tenantId: 'tenant-a',
      title: 'English Reading Reflection',
      subject: 'English',
      classes: ['A2'],
      teacher: 'teacher.english.demo1@educonnect.test',
    },
    {
      id: 'assign-b-001',
      tenantId: 'tenant-b',
      title: 'Computer Science Basics Quiz',
      subject: 'Computer Science',
      classes: ['B1', 'B2'],
      teacher: 'teacher.math.demo2@educonnect.test',
    },
  ];

  for (const a of assignmentData) {
    const teacherId = idsByEmail.get(a.teacher);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);

    const tableRecord = {
      id: a.id,
      school_id: a.tenantId,
      title: a.title,
      description: `Practice and review for ${a.subject}`,
      class_ids: a.classes,
      subject_id: a.subject,
      due_at: dueDate.toISOString(),
      created_by: teacherId,
    };
    const documentRecord = {
      ...tableRecord,
      tenantId: a.tenantId,
      schoolId: a.tenantId,
      classId: a.classes[0],
      targetClasses: a.classes,
      subject: a.subject,
      dueDate: dueDate.toISOString(),
      createdBy: teacherId,
      createdAt: now,
    };

    await supabase.from('assignments').upsert(tableRecord);
    await upsertDocument(supabase, 'assignments', a.id, a.tenantId, documentRecord);

    // Seed some submissions
    const students = seedUsers.filter(
      (u) =>
        u.tenantId === a.tenantId &&
        u.role === 'student' &&
        u.classId &&
        a.classes.includes(u.classId)
    );
    for (const student of students) {
      const studentId = idsByEmail.get(student.email);
      if (!studentId) continue;

      const tableSubmission = {
        assignment_id: a.id,
        student_id: studentId,
        status: student.email.includes('a') ? 'graded' : 'submitted',
        grade: student.email.includes('a') ? 'A' : null,
        feedback: student.email.includes('a') ? 'Excellent work!' : null,
        submitted_at: now,
      };
      const documentSubmission = {
        ...tableSubmission,
        assignmentId: a.id,
        studentId,
        submittedAt: now,
        tenantId: a.tenantId,
      };
      await supabase
        .from('submissions')
        .upsert(tableSubmission, { onConflict: 'assignment_id,student_id' });
      await upsertDocument(
        supabase,
        'submissions',
        `${a.id}-${studentId}`,
        a.tenantId,
        documentSubmission
      );
    }
  }
}

async function seedFees(supabase: SupabaseClient, idsByEmail: Map<string, string>) {
  const feeTypes = [
    { key: 'tuition-term-1', label: 'Tuition Fee Term 1', amount: 25000 },
    { key: 'library', label: 'Library Fee', amount: 1500 },
  ];

  const students = seedUsers.filter((u) => u.role === 'student');
  for (const student of students) {
    const studentId = idsByEmail.get(student.email);
    if (!studentId) continue;

    for (const ft of feeTypes) {
      const docId = `fee-${student.tenantId}-${studentId}-${ft.key}`;
      const tableId = deterministicUuid(docId);
      const paid = student.email.includes('a') ? ft.amount : 0;
      const tableRecord = {
        id: tableId,
        school_id: student.tenantId,
        student_id: studentId,
        label: ft.label,
        amount: ft.amount,
        status: paid >= ft.amount ? 'paid' : 'pending',
        due_at: now,
      };
      const documentRecord = {
        ...tableRecord,
        id: docId,
        tenantId: student.tenantId,
        schoolId: student.tenantId,
        studentId,
        classId: student.classId || 'default',
        amountDue: ft.amount,
        amountPaid: paid,
        dueDate: now.split('T')[0],
        uploadedAt: now,
        createdAt: now,
      };
      await supabase.from('fees').upsert(tableRecord);
      await upsertDocument(supabase, 'fees', docId, student.tenantId, documentRecord);
    }
  }
}

async function seedPerformance(supabase: SupabaseClient, idsByEmail: Map<string, string>) {
  const subjectsByTenant: Record<string, string[]> = {
    'tenant-a': ['Mathematics', 'Science', 'English'],
    'tenant-b': ['Mathematics', 'Computer Science', 'English'],
  };

  const students = seedUsers.filter((u) => u.role === 'student');
  for (const student of students) {
    const studentId = idsByEmail.get(student.email);
    if (!studentId) continue;

    const subjects = subjectsByTenant[student.tenantId] || ['Mathematics', 'Science'];
    for (const [index, subject] of subjects.entries()) {
      const score = 72 + ((student.email.length + index * 7) % 22);
      const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : 'C';
      const docId = `performance-${student.tenantId}-${studentId}-${subject.toLowerCase().replace(/\s+/g, '-')}-term-1`;
      const tableId = deterministicUuid(docId);
      const tableRecord = {
        id: tableId,
        school_id: student.tenantId,
        student_id: studentId,
        subject_id: subject,
        term: 'Term 1',
        score,
        grade,
        remarks: score >= 85 ? 'Strong progress' : 'Steady improvement needed',
      };
      const documentRecord = {
        ...tableRecord,
        id: docId,
        tenantId: student.tenantId,
        schoolId: student.tenantId,
        studentId,
        classId: student.classId || 'default',
        subject,
        maxScore: 100,
        date: now.split('T')[0],
        createdAt: now,
        updatedAt: now,
      };

      await supabase.from('performance').upsert(tableRecord);
      await upsertDocument(supabase, 'performance', docId, student.tenantId, documentRecord);
    }
  }
}

async function seedTimetable(supabase: SupabaseClient) {
  for (const tenant of tenants) {
    const classPrefix = tenant.id === 'tenant-b' ? 'B' : 'A';
    const subjects =
      tenant.id === 'tenant-b'
        ? ['Mathematics', 'Computer Science', 'English']
        : ['Mathematics', 'Science', 'English'];

    for (const section of ['1', '2']) {
      const classId = `${classPrefix}${section}`;
      await upsertDocument(supabase, 'classes', classId, tenant.id, {
        classId,
        name: `Class ${classId}`,
        section: section === '1' ? 'A' : 'B',
        capacity: 36,
      });
      await upsertDocument(supabase, 'sections', `${classId}-section`, tenant.id, {
        classId,
        sectionId: `${classId}-section`,
        name: section === '1' ? 'Section A' : 'Section B',
      });
    }

    for (const subject of subjects) {
      const subjectId = `${tenant.id}-${subject.toLowerCase().replace(/\s+/g, '-')}`;
      await upsertDocument(supabase, 'subjects', subjectId, tenant.id, {
        subjectId,
        name: subject,
        classIds: [`${classPrefix}1`, `${classPrefix}2`],
      });
    }

    await upsertDocument(supabase, 'timetable', `${tenant.id}-weekly`, tenant.id, {
      title: `${tenant.name} weekly timetable`,
      classIds: [`${classPrefix}1`, `${classPrefix}2`],
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      periods: subjects.map((subject, index) => ({
        subject,
        startsAt: `${9 + index}:00`,
        endsAt: `${10 + index}:00`,
      })),
    });
  }
}

async function seedLibrary(supabase: SupabaseClient, idsByEmail: Map<string, string>) {
  const resources = [
    {
      id: 'library-tenant-a-math-practice',
      tenantId: 'tenant-a',
      title: 'Mathematics Formula Handbook',
      subject: 'Mathematics',
      grade: '10',
      classIds: ['A1', 'A2'],
      uploadedBy: 'librarian.demo1@educonnect.test',
    },
    {
      id: 'library-tenant-a-science-lab',
      tenantId: 'tenant-a',
      title: 'Science Lab Safety Guide',
      subject: 'Science',
      grade: '10',
      classIds: ['A1'],
      uploadedBy: 'librarian.demo1@educonnect.test',
    },
    {
      id: 'library-tenant-b-cs-basics',
      tenantId: 'tenant-b',
      title: 'Computer Science Starter Pack',
      subject: 'Computer Science',
      grade: '9',
      classIds: ['B1', 'B2'],
      uploadedBy: 'librarian.demo2@educonnect.test',
    },
  ];

  for (const resource of resources) {
    await upsertDocument(supabase, 'library', resource.id, resource.tenantId, {
      title: resource.title,
      description: `Curated demo resource for ${resource.subject}.`,
      subject: resource.subject,
      grade: resource.grade,
      classIds: resource.classIds,
      type: 'document',
      fileUrl: 'https://example.com/demo-resource.pdf',
      tags: ['demo', resource.subject.toLowerCase().replace(/\s+/g, '-')],
      visibility: 'classes',
      targetClassIds: resource.classIds,
      availableCopies: 4,
      borrowedCount: 0,
      uploadedBy: idsByEmail.get(resource.uploadedBy) || null,
      uploadedAt: now,
      updatedAt: now,
    });
  }
}

async function seedAnnouncements(supabase: SupabaseClient, idsByEmail: Map<string, string>) {
  const announcements = [
    {
      id: 'announcement-tenant-a-welcome',
      tenantId: 'tenant-a',
      title: 'Welcome to the new academic week',
      content: 'Please review attendance, fee reminders, and assignment schedules for the week.',
      authorEmail: 'principal.demo1@educonnect.test',
    },
    {
      id: 'announcement-tenant-b-library',
      tenantId: 'tenant-b',
      title: 'Library resources updated',
      content: 'New Computer Science and English resources are available in the library module.',
      authorEmail: 'principal.demo2@educonnect.test',
    },
  ];

  for (const announcement of announcements) {
    await upsertDocument(supabase, 'announcements', announcement.id, announcement.tenantId, {
      title: announcement.title,
      content: announcement.content,
      targetRoles: ['all'],
      targetClasses: ['all'],
      visibility: 'all',
      category: 'general',
      priority: 'normal',
      pinned: false,
      status: 'published',
      authorId: idsByEmail.get(announcement.authorEmail) || null,
      authorName: seedUsers.find((user) => user.email === announcement.authorEmail)?.displayName,
      createdAt: now,
      updatedAt: now,
      timestamp: now,
      views: [],
    });
  }
}

async function seedNotifications(supabase: SupabaseClient, idsByEmail: Map<string, string>) {
  const notifications = [
    {
      id: 'notification-tenant-a-attendance',
      tenantId: 'tenant-a',
      title: 'Attendance follow-up',
      message: 'Class A1 attendance is ready for review.',
      targetRoles: ['admin', 'principal', 'teacher'],
      actorEmail: 'teacher.math.demo1@educonnect.test',
    },
    {
      id: 'notification-tenant-b-fees',
      tenantId: 'tenant-b',
      title: 'Fee reminder queue ready',
      message: 'Pending fee reminders are available for School B.',
      targetRoles: ['admin', 'principal', 'accountant'],
      actorEmail: 'accountant.demo2@educonnect.test',
    },
  ];

  for (const notification of notifications) {
    await upsertDocument(supabase, 'notifications', notification.id, notification.tenantId, {
      title: notification.title,
      message: notification.message,
      type: 'system',
      href: '/dashboard',
      targetRoles: notification.targetRoles,
      targetClasses: ['all'],
      targetUserIds: [],
      readBy: [],
      archivedBy: [],
      archived: false,
      actorId: idsByEmail.get(notification.actorEmail) || null,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function countDocuments(supabase: SupabaseClient, collection: string) {
  const { count, error } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('collection', collection);

  if (error) throw error;
  return count || 0;
}

async function printSeedVerificationSummary(supabase: SupabaseClient) {
  const collections = [
    ['tenants', 'schools'],
    ['profiles', 'users'],
    ['users documents', 'users'],
    ['attendance', 'attendance'],
    ['assignments', 'assignments'],
    ['submissions', 'submissions'],
    ['fees', 'fees'],
    ['performance/grades', 'performance'],
    ['library', 'library'],
    ['announcements', 'announcements'],
    ['notifications', 'notifications'],
  ] as const;

  console.log('Seed verification summary:');
  for (const [label, collection] of collections) {
    console.log(`- ${label}: ${await countDocuments(supabase, collection)}`);
  }
}

async function main() {
  if (dryRun) {
    console.log('Dry run enabled. Skipping actual database writes.');
    return;
  }

  const supabase = getSupabase();
  const idsByEmail = new Map<string, string>();

  await cleanupKnownDemoData(supabase);

  console.log('Seeding tenants...');
  for (const t of tenants) {
    await supabase.from('tenants').upsert(t);
    await upsertDocument(supabase, 'schools', t.id, t.id, { name: t.name, ...t.metadata });
  }

  console.log('Seeding users...');
  for (const user of seedUsers) {
    await seedUser(supabase, user, idsByEmail);
  }

  console.log('Seeding module data...');
  await seedAttendance(supabase, idsByEmail);
  await seedAssignments(supabase, idsByEmail);
  await seedFees(supabase, idsByEmail);
  await seedPerformance(supabase, idsByEmail);
  await seedTimetable(supabase);
  await seedLibrary(supabase, idsByEmail);
  await seedAnnouncements(supabase, idsByEmail);
  await seedNotifications(supabase, idsByEmail);

  await printSeedVerificationSummary(supabase);
  console.log('Seed complete!');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
