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
  let query = supabase.from('documents').select('id', { count: 'exact', head: true }).eq('collection', collection);

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
    if (count < 1) {
      failures.push({
        label: `${tenantId} collection ${collection}`,
        expected: 'at least 1 document',
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

async function main() {
  const supabase = getSupabase();
  const failures: Failure[] = [];

  console.log('Verifying demo seed data...');

  for (const tenantId of demoTenantIds) {
    await verifyTenantRecord(supabase, tenantId, failures);
    await verifyRoleCoverage(supabase, tenantId, failures);
    await verifyCollectionCoverage(supabase, tenantId, failures);
    await verifyParentLinks(supabase, tenantId, failures);
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
