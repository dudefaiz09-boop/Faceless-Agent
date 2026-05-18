import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '../../.env', quiet: true });
config({ quiet: true });

type SeedUser = {
  email: string;
  password: string;
  displayName: string;
  role: string;
  classId?: string;
  classIds?: string[];
  linkedStudentEmails?: string[];
  permissions: Record<string, boolean>;
  assignedModules?: string[];
  section?: string;
  subjects?: string[];
};

const schoolId = process.env.SEED_SCHOOL_ID || 'default-school';
const now = new Date().toISOString();

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
  {
    email: 'admin@educonnect.test',
    password: 'Admin@1234',
    displayName: 'Admin User',
    role: 'admin',
    permissions: manageEverything,
  },
  {
    email: 'principal@educonnect.test',
    password: 'Principal@1234',
    displayName: 'Principal Rao',
    role: 'principal',
    permissions: {
      createAnnouncements: true,
      markAttendance: true,
      viewReports: true,
      viewAuditLogs: true,
      manageAnnouncements: true,
      viewAttendance: true,
      viewPerformance: true,
      viewStudentDetails: true,
    },
  },
  {
    email: 'teacher.a@educonnect.test',
    password: 'Teach@1234',
    displayName: 'Anika Teacher',
    role: 'teacher',
    subjects: ['Mathematics', 'Science'],
    permissions: {
      useAI: true,
      createAnnouncements: true,
      manageAnnouncements: true,
      manageAssignments: true,
      markAttendance: true,
      viewAttendance: true,
      viewPerformance: true,
      viewStudentDetails: true,
    },
  },
  {
    email: 'teacher.b@educonnect.test',
    password: 'Teach@1234',
    displayName: 'Bharat Teacher',
    role: 'teacher',
    subjects: ['English', 'History'],
    permissions: {
      useAI: true,
      createAnnouncements: true,
      manageAnnouncements: true,
      manageAssignments: true,
      markAttendance: true,
      viewAttendance: true,
      viewPerformance: true,
      viewStudentDetails: true,
    },
  },
  {
    email: 'student.a@educonnect.test',
    password: 'Test@1234',
    displayName: 'Student A',
    role: 'student',
    classId: '10A',
    section: 'A',
    permissions: { viewOwnRecords: true, submitAssignments: true, payFees: true },
  },
  {
    email: 'student.b@educonnect.test',
    password: 'Test@1234',
    displayName: 'Student B',
    role: 'student',
    classId: '10B',
    section: 'B',
    permissions: { viewOwnRecords: true, submitAssignments: true, payFees: true },
  },
  {
    email: 'parent.a@educonnect.test',
    password: 'Parent@1234',
    displayName: 'Parent A',
    role: 'parent',
    linkedStudentEmails: ['student.a@educonnect.test'],
    permissions: { viewOwnRecords: true },
  },
  {
    email: 'librarian@educonnect.test',
    password: 'Library@1234',
    displayName: 'Library Staff',
    role: 'librarian',
    permissions: {
      manageLibrary: true,
      viewStudentDetails: true,
      viewAssignments: true,
    },
  },
  {
    email: 'accountant@educonnect.test',
    password: 'Account@1234',
    displayName: 'Accounts Staff',
    role: 'accountant',
    permissions: {
      manageFees: true,
    },
  },
  {
    email: 'admin@educonnect.tst',
    password: 'Admin@1234',
    displayName: 'Admin Demo',
    role: 'admin',
    permissions: manageEverything,
  },
  {
    email: 'principal@educonnect.tst',
    password: 'Principal@1234',
    displayName: 'Principal Demo',
    role: 'principal',
    permissions: {
      createAnnouncements: true,
      markAttendance: true,
      viewReports: true,
      viewAuditLogs: true,
      viewAttendance: true,
      viewPerformance: true,
      viewStudentDetails: true,
    },
  },
  {
    email: 'teacher@educonnect.tst',
    password: 'Teach@1234',
    displayName: 'Teacher Demo',
    role: 'teacher',
    classId: '10A',
    subjects: ['Mathematics'],
    permissions: {
      useAI: true,
      createAnnouncements: true,
      manageAssignments: true,
      markAttendance: true,
      viewAttendance: true,
      viewPerformance: true,
      viewStudentDetails: true,
    },
  },
  {
    email: 'librarian@educonnect.tst',
    password: 'Library@1234',
    displayName: 'Librarian Demo',
    role: 'librarian',
    permissions: { manageLibrary: true },
  },
  {
    email: 'accountant@educonnect.tst',
    password: 'Account@1234',
    displayName: 'Accountant Demo',
    role: 'accountant',
    permissions: { manageFees: true },
  },
  {
    email: 'student@educonnect.tst',
    password: 'Test@1234',
    displayName: 'Student Demo',
    role: 'student',
    classId: '10A',
    section: 'A',
    permissions: { useAI: true, viewOwnRecords: true, submitAssignments: true, payFees: true },
  },
  {
    email: 'parent@educonnect.tst',
    password: 'Parent@1234',
    displayName: 'Parent Demo',
    role: 'parent',
    linkedStudentEmails: ['student@educonnect.tst'],
    permissions: { viewOwnRecords: true },
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
  data: Record<string, unknown>
) {
  const { error } = await supabase.from('documents').upsert(
    {
      collection,
      id,
      data: {
        ...data,
        id,
        schoolId,
        tenantId: schoolId,
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
    isAdmin: seedUser.role === 'admin',
    schoolId,
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

  const linkedStudentIds = (seedUser.linkedStudentEmails || [])
    .map((email) => idsByEmail.get(email))
    .filter(Boolean);

  await upsertDocument(supabase, 'users', user.id, {
    uid: user.id,
    email: seedUser.email,
    displayName: seedUser.displayName,
    role: seedUser.role,
    roles: [seedUser.role],
    isAdmin: seedUser.role === 'admin',
    classId: seedUser.classId || null,
    classIds: seedUser.classIds || (seedUser.classId ? [seedUser.classId] : []),
    linkedStudentIds,
    permissions: seedUser.permissions,
    permissionKeys: Object.keys(seedUser.permissions).filter((key) => seedUser.permissions[key]),
    assignedModules: seedUser.assignedModules || modulesByRole[seedUser.role] || [],
    section: seedUser.section || null,
    sectionIds: seedUser.section ? [seedUser.section] : [],
    subjects: seedUser.subjects || [],
    subjectIds: seedUser.subjects || [],
    status: 'active',
    createdAt: user.created_at || now,
  });

  return user.id;
}

async function main() {
  if (dryRun) {
    console.log(`Dry run: would seed ${seedUsers.length} users into school "${schoolId}".`);
    seedUsers.forEach((user) => console.log(`- ${user.email} (${user.role})`));
    return;
  }

  const supabase = getSupabase();
  const idsByEmail = new Map<string, string>();

  await upsertDocument(supabase, 'schools', schoolId, {
    name: 'Default School',
    createdAt: now,
  });

  await upsertDocument(supabase, 'classes', '10A', {
    name: '10A',
    grade: '10',
    section: 'A',
    createdAt: now,
  });

  await upsertDocument(supabase, 'classes', '10B', {
    name: '10B',
    grade: '10',
    section: 'B',
    createdAt: now,
  });

  for (const user of seedUsers) {
    await seedUser(supabase, user, idsByEmail);
  }

  const teacherId = idsByEmail.get('teacher.a@educonnect.test') || 'system';
  await upsertDocument(supabase, 'announcements', 'welcome-demo', {
    title: 'Welcome to EduConnect',
    content: 'Your Supabase migration demo data is ready.',
    targetClasses: ['all'],
    targetRoles: ['all'],
    visibility: 'school',
    priority: 'normal',
    authorId: teacherId,
    authorName: 'Anika Teacher',
    createdAt: now,
  });

  console.log(`Seeded ${seedUsers.length} users and starter documents into "${schoolId}".`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
