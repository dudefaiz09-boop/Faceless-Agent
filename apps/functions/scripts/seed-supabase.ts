import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';

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

const tenants = [
  {
    id: 'tenant-a',
    name: 'School A',
    slug: 'school-a',
    metadata: { city: 'Pune', board: 'CBSE', academicYear: '2026-2027', timezone: 'Asia/Kolkata' },
  },
  {
    id: 'tenant-b',
    name: 'School B',
    slug: 'school-b',
    metadata: { city: 'Mumbai', board: 'ICSE', academicYear: '2026-2027', timezone: 'Asia/Kolkata' },
  },
  {
    id: 'tenant-c',
    name: 'School C',
    slug: 'school-c',
    metadata: {
      city: 'Bengaluru',
      board: 'State Board',
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
    email: 'student.a@educonnect.test',
    password: 'Test@1234',
    role: 'student',
    tenantId: 'tenant-a',
    studentId: 'stu-a-001',
    displayName: 'Aarav Sharma',
    classId: 'A1',
    permissions: studentPermissions,
  },
  {
    email: 'student.b@educonnect.test',
    password: 'Test@1234',
    role: 'student',
    tenantId: 'tenant-a',
    studentId: 'stu-a-002',
    displayName: 'Ananya Patil',
    classId: 'A2',
    permissions: studentPermissions,
  },
  {
    email: 'teacher.a@educonnect.test',
    password: 'Teach@1234',
    role: 'teacher',
    tenantId: 'tenant-a',
    teacherId: 'tch-a-001',
    displayName: 'Meera Iyer',
    classIds: ['A1', 'A2'],
    subjects: ['Mathematics', 'Science'],
    permissions: teacherPermissions,
  },
  {
    email: 'teacher.b@educonnect.test',
    password: 'Teach@1234',
    role: 'teacher',
    tenantId: 'tenant-a',
    teacherId: 'tch-a-002',
    displayName: 'Rohan Deshmukh',
    classIds: ['A2'],
    subjects: ['English', 'History'],
    permissions: teacherPermissions,
  },
  {
    email: 'librarian@educonnect.test',
    password: 'Library@1234',
    role: 'librarian',
    tenantId: 'tenant-a',
    staffId: 'lib-a-001',
    displayName: 'Kavita Rao',
    permissions: { manageLibrary: true, viewStudents: true, viewAssignments: true },
  },
  {
    email: 'principal@educonnect.test',
    password: 'Principal@1234',
    role: 'principal',
    tenantId: 'tenant-a',
    staffId: 'prn-a-001',
    displayName: 'Principal Nair',
    permissions: { ...teacherPermissions, manageStudents: true, manageTeachers: true, manageFees: true, viewFinancials: true, manageLibrary: true, manageUsers: true },
  },
  {
    email: 'parent.a@educonnect.test',
    password: 'Parent@1234',
    role: 'parent',
    tenantId: 'tenant-a',
    displayName: 'Parent A',
    linkedStudentIds: ['student.a@educonnect.test', 'student.b@educonnect.test'], // Will resolve to IDs
    permissions: studentPermissions,
  },

  // Tenant B
  {
    email: 'student.c@educonnect.test',
    password: 'Test@1234',
    role: 'student',
    tenantId: 'tenant-b',
    studentId: 'stu-b-001',
    displayName: 'Kabir Khan',
    classId: 'B1',
    permissions: studentPermissions,
  },
  {
    email: 'student.d@educonnect.test',
    password: 'Test@1234',
    role: 'student',
    tenantId: 'tenant-b',
    studentId: 'stu-b-002',
    displayName: 'Diya Mehta',
    classId: 'B2',
    permissions: studentPermissions,
  },
  {
    email: 'teacher.c@educonnect.test',
    password: 'Teach@1234',
    role: 'teacher',
    tenantId: 'tenant-b',
    teacherId: 'tch-b-001',
    displayName: 'Arjun Sen',
    classIds: ['B1', 'B2'],
    subjects: ['Mathematics', 'Computer Science'],
    permissions: teacherPermissions,
  },
  {
    email: 'librarian.b@educonnect.test',
    password: 'Library@1234',
    role: 'librarian',
    tenantId: 'tenant-b',
    staffId: 'lib-b-001',
    displayName: 'Farah Ali',
    permissions: { manageLibrary: true, viewStudents: true, viewAssignments: true },
  },
  {
    email: 'principal.b@educonnect.test',
    password: 'Principal@1234',
    role: 'principal',
    tenantId: 'tenant-b',
    staffId: 'prn-b-001',
    displayName: 'Principal Kapoor',
    permissions: { ...teacherPermissions, manageStudents: true, manageTeachers: true, manageFees: true, viewFinancials: true, manageLibrary: true, manageUsers: true },
  },
  {
    email: 'parent.b@educonnect.test',
    password: 'Parent@1234',
    role: 'parent',
    tenantId: 'tenant-b',
    displayName: 'Parent B',
    linkedStudentIds: ['student.c@educonnect.test', 'student.d@educonnect.test'],
    permissions: studentPermissions,
  },

  // Tenant C
  {
    email: 'student.e@educonnect.test',
    password: 'Test@1234',
    role: 'student',
    tenantId: 'tenant-c',
    studentId: 'stu-c-001',
    displayName: 'Ishaan Reddy',
    classId: 'C1',
    permissions: studentPermissions,
  },
  {
    email: 'student.f@educonnect.test',
    password: 'Test@1234',
    role: 'student',
    tenantId: 'tenant-c',
    studentId: 'stu-c-002',
    displayName: 'Tara Menon',
    classId: 'C2',
    permissions: studentPermissions,
  },
  {
    email: 'teacher.d@educonnect.test',
    password: 'Teach@1234',
    role: 'teacher',
    tenantId: 'tenant-c',
    teacherId: 'tch-c-001',
    displayName: 'Nisha Rao',
    classIds: ['C1', 'C2'],
    subjects: ['Science', 'Social Studies'],
    permissions: teacherPermissions,
  },
  {
    email: 'accountant.c@educonnect.test',
    password: 'Accounts@1234',
    role: 'accountant',
    tenantId: 'tenant-c',
    staffId: 'acc-c-001',
    displayName: 'Vikram Joshi',
    permissions: { manageFees: true, viewStudents: true, viewReports: true, viewFinancials: true },
  },
  {
    email: 'principal.c@educonnect.test',
    password: 'Principal@1234',
    role: 'principal',
    tenantId: 'tenant-c',
    staffId: 'prn-c-001',
    displayName: 'Principal Fernandes',
    permissions: { ...teacherPermissions, manageStudents: true, manageTeachers: true, manageFees: true, viewFinancials: true, manageLibrary: true, manageUsers: true },
  },
  {
    email: 'parent.c@educonnect.test',
    password: 'Parent@1234',
    role: 'parent',
    tenantId: 'tenant-c',
    displayName: 'Parent C',
    linkedStudentIds: ['student.e@educonnect.test', 'student.f@educonnect.test'],
    permissions: studentPermissions,
  },

  // Global Admin
  {
    email: 'admin@educonnect.test',
    password: 'Admin@1234',
    role: 'admin',
    tenantId: 'tenant-a',
    isSuperAdmin: true,
    managedTenantIds: ['tenant-a', 'tenant-b', 'tenant-c'],
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
    await supabase.from('user_tenants').upsert({
      user_id: user.id,
      email: seedUser.email,
      tenant_id: tid,
      role: seedUser.role,
      is_default: tid === seedUser.tenantId,
      is_active: true,
      updated_at: now,
    }, { onConflict: 'email,tenant_id' });
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

  const studentEmails = [
    'student.a@educonnect.test', 'student.b@educonnect.test',
    'student.c@educonnect.test', 'student.d@educonnect.test',
    'student.e@educonnect.test', 'student.f@educonnect.test'
  ];

  for (const email of studentEmails) {
    const userId = idsByEmail.get(email);
    const user = seedUsers.find(u => u.email === email);
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

      await supabase.from('attendance').upsert(record, { onConflict: 'student_id,class_id,attendance_date' });

      // Legacy document
      await upsertDocument(supabase, 'attendance', `${userId}-${dateStr}`, user.tenantId, record);
    }
  }
}

async function seedAssignments(supabase: SupabaseClient, idsByEmail: Map<string, string>) {
  const assignmentData = [
    { id: 'assign-a-001', tenantId: 'tenant-a', title: 'Algebra Practice Worksheet', subject: 'Mathematics', classes: ['A1', 'A2'], teacher: 'teacher.a@educonnect.test' },
    { id: 'assign-a-002', tenantId: 'tenant-a', title: 'English Reading Reflection', subject: 'English', classes: ['A2'], teacher: 'teacher.b@educonnect.test' },
    { id: 'assign-b-001', tenantId: 'tenant-b', title: 'Computer Science Basics Quiz', subject: 'Computer Science', classes: ['B1', 'B2'], teacher: 'teacher.c@educonnect.test' },
    { id: 'assign-c-001', tenantId: 'tenant-c', title: 'Science Lab Report', subject: 'Science', classes: ['C1', 'C2'], teacher: 'teacher.d@educonnect.test' },
  ];

  for (const a of assignmentData) {
    const teacherId = idsByEmail.get(a.teacher);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);

    const record = {
      id: a.id,
      school_id: a.tenantId,
      title: a.title,
      description: `Practice and review for ${a.subject}`,
      class_ids: a.classes,
      subject_id: a.subject,
      due_at: dueDate.toISOString(),
      created_by: teacherId,
    };

    await supabase.from('assignments').upsert(record);
    await upsertDocument(supabase, 'assignments', a.id, a.tenantId, record);

    // Seed some submissions
    const students = seedUsers.filter(u => u.tenantId === a.tenantId && u.role === 'student' && (u.classId && a.classes.includes(u.classId)));
    for (const student of students) {
      const studentId = idsByEmail.get(student.email);
      if (!studentId) continue;

      const submission = {
        assignment_id: a.id,
        student_id: studentId,
        status: student.email.includes('a') ? 'graded' : 'submitted',
        grade: student.email.includes('a') ? 'A' : null,
        feedback: student.email.includes('a') ? 'Excellent work!' : null,
        submitted_at: now,
      };
      await supabase.from('submissions').upsert(submission, { onConflict: 'assignment_id,student_id' });
      await upsertDocument(supabase, 'submissions', `${a.id}-${studentId}`, a.tenantId, submission);
    }
  }
}

async function seedFees(supabase: SupabaseClient, idsByEmail: Map<string, string>) {
  const feeTypes = [
    { label: 'Tuition Fee Term 1', amount: 25000 },
    { label: 'Library Fee', amount: 1500 },
  ];

  const students = seedUsers.filter(u => u.role === 'student');
  for (const student of students) {
    const studentId = idsByEmail.get(student.email);
    if (!studentId) continue;

    for (const ft of feeTypes) {
      const feeId = randomUUID();
      const record = {
        id: feeId,
        school_id: student.tenantId,
        student_id: studentId,
        label: ft.label,
        amount: ft.amount,
        status: student.email.includes('a') ? 'paid' : 'pending',
        due_at: now,
      };
      await supabase.from('fees').upsert(record);
      await upsertDocument(supabase, 'fees', feeId, student.tenantId, record);
    }
  }
}

async function main() {
  const supabase = getSupabase();
  const idsByEmail = new Map<string, string>();

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
  await seedTimetable(supabase);
  await seedLibrary(supabase, idsByEmail);
  await seedAnnouncements(supabase, idsByEmail);
  await seedNotifications(supabase, idsByEmail);

  console.log('Seed complete!');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
