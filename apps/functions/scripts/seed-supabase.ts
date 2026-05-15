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
  linkedStudentEmails?: string[];
  permissions: Record<string, boolean>;
  section?: string;
  subjects?: string[];
};

const dryRun = process.argv.includes('--dry-run');
const schoolId = process.env.SEED_SCHOOL_ID || 'default-school';
const now = new Date().toISOString();

const manageEverything = {
  manageUsers: true,
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
    role: 'staff',
    permissions: manageEverything,
  },
  {
    email: 'teacher.a@educonnect.test',
    password: 'Teach@1234',
    displayName: 'Anika Teacher',
    role: 'teacher',
    subjects: ['Mathematics', 'Science'],
    permissions: {
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
    role: 'staff',
    permissions: {
      manageLibrary: true,
      viewStudentDetails: true,
      viewAssignments: true,
    },
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

async function seedUser(supabase: SupabaseClient, seedUser: SeedUser, idsByEmail: Map<string, string>) {
  const existingUser = await findUserByEmail(supabase, seedUser.email);
  const appMetadata = {
    roles: [seedUser.role],
    isAdmin: seedUser.role === 'admin',
    schoolId,
    classId: seedUser.classId || null,
    permissions: seedUser.permissions,
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
    linkedStudentIds,
    permissions: seedUser.permissions,
    section: seedUser.section || null,
    subjects: seedUser.subjects || [],
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
