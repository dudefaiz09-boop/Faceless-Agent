import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '../../.env', quiet: true });
config({ quiet: true });

const now = new Date().toISOString();
const demoPassword = 'Test@123456';

const staffUsers = [
  {
    email: 'staff.demo1@educonnect.test',
    displayName: 'Demo Academy Staff',
    tenantId: 'tenant-a',
    staffId: 'stf-a-001',
  },
  {
    email: 'staff.demo2@educonnect.test',
    displayName: 'International School Staff',
    tenantId: 'tenant-b',
    staffId: 'stf-b-001',
  },
];

const staffPermissions = {
  viewStudents: true,
  viewAttendance: true,
  viewReports: true,
  createAnnouncements: true,
};

const staffModules = ['dashboard', 'announcements', 'attendance', 'chat', 'students'];

const borrowExamples = [
  {
    id: 'borrow-tenant-a-active',
    tenantId: 'tenant-a',
    resourceId: 'library-tenant-a-math-practice',
    studentEmail: 'student.a.demo1@educonnect.test',
    dueOffsetDays: 7,
    status: 'borrowed',
  },
  {
    id: 'borrow-tenant-a-overdue',
    tenantId: 'tenant-a',
    resourceId: 'library-tenant-a-science-lab',
    studentEmail: 'student.b.demo1@educonnect.test',
    dueOffsetDays: -3,
    status: 'borrowed',
  },
  {
    id: 'borrow-tenant-b-due-soon',
    tenantId: 'tenant-b',
    resourceId: 'library-tenant-b-cs-basics',
    studentEmail: 'student.a.demo2@educonnect.test',
    dueOffsetDays: 1,
    status: 'borrowed',
  },
] as const;

const feePaymentExamples = [
  {
    tenantId: 'tenant-a',
    studentEmail: 'student.a.demo1@educonnect.test',
    feeKey: 'tuition-term-1',
    amount: 25000,
    method: 'demo_receipt',
  },
  {
    tenantId: 'tenant-a',
    studentEmail: 'student.a.demo1@educonnect.test',
    feeKey: 'library',
    amount: 1500,
    method: 'demo_receipt',
  },
  {
    tenantId: 'tenant-b',
    studentEmail: 'student.a.demo2@educonnect.test',
    feeKey: 'tuition-term-1',
    amount: 25000,
    method: 'demo_receipt',
  },
  {
    tenantId: 'tenant-b',
    studentEmail: 'student.a.demo2@educonnect.test',
    feeKey: 'library',
    amount: 1500,
    method: 'demo_receipt',
  },
];

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding demo extras.');
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
        tenantId,
        updatedAt: now,
      },
    },
    { onConflict: 'collection,id' }
  );

  if (error) throw error;
}

async function seedStaffUsers(supabase: SupabaseClient) {
  for (const staff of staffUsers) {
    const existingUser = await findUserByEmail(supabase, staff.email);
    const appMetadata = {
      role: 'staff',
      roles: ['staff'],
      isAdmin: false,
      isSuperAdmin: false,
      schoolId: staff.tenantId,
      tenantId: staff.tenantId,
      managedTenantIds: [staff.tenantId],
      permissions: staffPermissions,
      assignedModules: staffModules,
      status: 'active',
    };
    const userMetadata = { display_name: staff.displayName };

    const result = existingUser
      ? await supabase.auth.admin.updateUserById(existingUser.id, {
          password: demoPassword,
          app_metadata: appMetadata,
          user_metadata: userMetadata,
        })
      : await supabase.auth.admin.createUser({
          email: staff.email,
          password: demoPassword,
          email_confirm: true,
          app_metadata: appMetadata,
          user_metadata: userMetadata,
        });

    if (result.error) throw result.error;
    const user = result.data.user;
    if (!user) throw new Error(`Failed to upsert ${staff.email}`);

    await supabase.from('profiles').upsert({
      id: user.id,
      school_id: staff.tenantId,
      email: staff.email,
      display_name: staff.displayName,
      role: 'staff',
      roles: ['staff'],
      is_super_admin: false,
      managed_tenant_ids: [staff.tenantId],
      permissions: staffPermissions,
      assigned_modules: staffModules,
      status: 'active',
      updated_at: now,
    });

    await supabase.from('user_tenants').upsert(
      {
        user_id: user.id,
        email: staff.email,
        tenant_id: staff.tenantId,
        role: 'staff',
        is_default: true,
        is_active: true,
        updated_at: now,
      },
      { onConflict: 'email,tenant_id' }
    );

    await upsertDocument(supabase, 'users', user.id, staff.tenantId, {
      uid: user.id,
      email: staff.email,
      displayName: staff.displayName,
      role: 'staff',
      roles: ['staff'],
      isAdmin: false,
      isSuperAdmin: false,
      schoolId: staff.tenantId,
      tenantId: staff.tenantId,
      managedTenantIds: [staff.tenantId],
      permissions: staffPermissions,
      assignedModules: staffModules,
      staffId: staff.staffId,
      status: 'active',
      createdAt: user.created_at || now,
    });
  }
}

function dateWithOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

async function seedBorrowExamples(supabase: SupabaseClient) {
  for (const example of borrowExamples) {
    const student = await findUserByEmail(supabase, example.studentEmail);
    if (!student) {
      console.warn(`Skipping borrow example for missing student ${example.studentEmail}`);
      continue;
    }

    await upsertDocument(supabase, 'borrowRecords', example.id, example.tenantId, {
      resourceId: example.resourceId,
      studentId: student.id,
      studentName: student.user_metadata?.display_name || student.email || 'Demo Student',
      borrowedAt: dateWithOffset(-7),
      dueAt: dateWithOffset(example.dueOffsetDays),
      status: example.status,
      returnedAt: null,
      createdAt: now,
    });
  }

  await upsertDocument(supabase, 'library', 'library-tenant-a-math-practice', 'tenant-a', {
    borrowedCount: 1,
    updatedAt: now,
  });
  await upsertDocument(supabase, 'library', 'library-tenant-a-science-lab', 'tenant-a', {
    borrowedCount: 1,
    updatedAt: now,
  });
  await upsertDocument(supabase, 'library', 'library-tenant-b-cs-basics', 'tenant-b', {
    borrowedCount: 1,
    updatedAt: now,
  });
}

async function seedPaymentExamples(supabase: SupabaseClient) {
  for (const example of feePaymentExamples) {
    const student = await findUserByEmail(supabase, example.studentEmail);
    if (!student) {
      console.warn(`Skipping payment example for missing student ${example.studentEmail}`);
      continue;
    }

    const feeId = `fee-${example.tenantId}-${student.id}-${example.feeKey}`;
    const paymentId = `payment-${example.tenantId}-${student.id}-${example.feeKey}`;

    await upsertDocument(supabase, 'payments', paymentId, example.tenantId, {
      feeId,
      studentId: student.id,
      amount: example.amount,
      method: example.method,
      paidAt: now,
      receiptUrl: `/fees/receipts/${feeId}`,
      recordedBy: 'demo-seed',
      createdAt: now,
    });
  }
}

async function main() {
  const supabase = getSupabase();

  console.log('Seeding demo extras...');
  await seedStaffUsers(supabase);
  await seedBorrowExamples(supabase);
  await seedPaymentExamples(supabase);
  console.log('Demo extras complete!');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
