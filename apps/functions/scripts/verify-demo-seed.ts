import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '../../.env', quiet: true });
config({ quiet: true });

const demoTenantIds = ['tenant-a', 'tenant-b'];
const requiredRoles = ['admin', 'principal', 'teacher', 'student', 'parent', 'librarian', 'accountant'];
const requiredCollections = [
  'schools',
  'users',
  'classes',
  'sections',
  'subjects',
  'timetable',
  'attendance',
  'assignments',
  'submissions',
  'fees',
  'performance',
  'library',
  'announcements',
  'notifications',
];

const minimumCollectionCounts: Record<string, number> = {
  users: 8,
  attendance: 4,
  assignments: 1,
  submissions: 1,
  fees: 4,
  performance: 4,
  library: 1,
  announcements: 1,
  notifications: 1,
};

type Failure = {
  label: string;
  expected: string;
  actual: string;
};

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before verifying demo seed data.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function countDocuments(
  supabase: SupabaseClient,
  collection: string,
  tenantId?: string
) {
  let query = supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('collection', collection);

  if (tenantId) {
    query = query.contains('data', { tenantId });
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function verifyTenantRecord(supabase: SupabaseClient, tenantId: string, failures: Failure[]) {
  const { data, error } = await supabase.from('tenants').select('id').eq('id', tenantId).maybeSingle();
  if (error) throw error;

  if (!data) {
    failures.push({
      label: `tenant ${tenantId}`,
      expected: 'tenant row exists',
      actual: 'missing',
    });
  }
}

async function verifyRoleCoverage(supabase: SupabaseClient, tenantId: string, failures: Failure[]) {
  const { data, error } = await supabase
    .from('documents')
    .select('id,data')
    .eq('collection', 'users')
    .contains('data', { tenantId });

  if (error) throw error;

  const users = data || [];
  const roles = new Set(
    users
      .map((row) => (row.data as { role?: string } | null)?.role)
      .filter((role): role is string => Boolean(role))
  );

  for (const role of requiredRoles) {
    if (!roles.has(role)) {
      failures.push({
        label: `${tenantId} role ${role}`,
        expected: 'at least 1 user document',
        actual: '0',
      });
    }
  }
}

async function verifyCollectionCoverage(
  supabase: SupabaseClient,
  tenantId: string,
  failures: Failure[]
) {
  for (const collection of requiredCollections) {
    const count = await countDocuments(supabase, collection, tenantId);
    const minimumCount = minimumCollectionCounts[collection] || 1;
    if (count < minimumCount) {
      failures.push({
        label: `${tenantId} collection ${collection}`,
        expected: `at least ${minimumCount} document(s)`,
        actual: String(count),
      });
    }
  }
}

async function verifyParentLinks(supabase: SupabaseClient, tenantId: string, failures: Failure[]) {
  const { data, error } = await supabase
    .from('documents')
    .select('id,data')
    .eq('collection', 'users')
    .contains('data', { tenantId, role: 'parent' });

  if (error) throw error;

  const parents = data || [];
  const hasLinkedParent = parents.some((row) => {
    const linkedStudentIds = (row.data as { linkedStudentIds?: string[] } | null)?.linkedStudentIds || [];
    return linkedStudentIds.length > 0;
  });

  if (!hasLinkedParent) {
    failures.push({
      label: `${tenantId} parent linked students`,
      expected: 'at least 1 parent with linkedStudentIds',
      actual: 'missing',
    });
  }
}

async function verifyAssignmentSubmissionCoverage(
  supabase: SupabaseClient,
  tenantId: string,
  failures: Failure[]
) {
  const { data: assignments, error: assignmentError } = await supabase
    .from('documents')
    .select('id')
    .eq('collection', 'assignments')
    .contains('data', { tenantId });
  if (assignmentError) throw assignmentError;

  const { data: submissions, error: submissionError } = await supabase
    .from('documents')
    .select('id')
    .eq('collection', 'submissions')
    .contains('data', { tenantId });
  if (submissionError) throw submissionError;

  if ((assignments || []).length > 0 && (submissions || []).length === 0) {
    failures.push({
      label: `${tenantId} assignment submissions`,
      expected: 'at least 1 seeded submission when assignments exist',
      actual: '0',
    });
  }
}

async function verifyFeeStatusCoverage(
  supabase: SupabaseClient,
  tenantId: string,
  failures: Failure[]
) {
  const { data, error } = await supabase
    .from('documents')
    .select('id,data')
    .eq('collection', 'fees')
    .contains('data', { tenantId });
  if (error) throw error;

  const statuses = new Set(
    (data || [])
      .map((row) => (row.data as { status?: string } | null)?.status)
      .filter((status): status is string => Boolean(status))
  );

  for (const status of ['paid', 'pending']) {
    if (!statuses.has(status)) {
      failures.push({
        label: `${tenantId} fee status ${status}`,
        expected: 'at least 1 fee row',
        actual: '0',
      });
    }
  }
}

async function main() {
  const supabase = getSupabase();
  const failures: Failure[] = [];

  console.log('Verifying demo seed data...');

  for (const tenantId of demoTenantIds) {
    await verifyTenantRecord(supabase, tenantId, failures);
    await verifyRoleCoverage(supabase, tenantId, failures);
    await verifyCollectionCoverage(supabase, tenantId, failures);
    await verifyParentLinks(supabase, tenantId, failures);
    await verifyAssignmentSubmissionCoverage(supabase, tenantId, failures);
    await verifyFeeStatusCoverage(supabase, tenantId, failures);
  }

  if (failures.length > 0) {
    console.error('Demo seed verification failed:');
    for (const failure of failures) {
      console.error(`- ${failure.label}: expected ${failure.expected}, actual ${failure.actual}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Demo seed verification passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
