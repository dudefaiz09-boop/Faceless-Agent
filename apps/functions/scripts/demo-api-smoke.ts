import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '../../.env', quiet: true });
config({ quiet: true });

type DemoTenant = 'tenant-a' | 'tenant-b';
type DemoRole =
  | 'admin'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'librarian'
  | 'accountant'
  | 'principal';

type DemoUser = {
  tenant: DemoTenant;
  role: DemoRole;
  email: string;
};

type SmokeContext = {
  tenant: DemoTenant;
  role: DemoRole;
  email: string;
  token: string;
  uid: string;
  profile: Record<string, unknown>;
};

type SmokeResult = {
  ok: boolean;
  tenant: DemoTenant;
  role: DemoRole;
  module: string;
  reason: string;
};

const apiBaseUrl =
  process.env.DEMO_API_SMOKE_BASE_URL ||
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL;
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;
const demoPassword = requireEnv('DEMO_API_SMOKE_PASSWORD', process.env.DEMO_API_SMOKE_PASSWORD);
const defaultClassByTenant: Record<DemoTenant, string> = {
  'tenant-a': 'A1',
  'tenant-b': 'B1',
};

const demoUsers: DemoUser[] = [
  { tenant: 'tenant-a', role: 'admin', email: 'admin.demo1@educonnect.test' },
  { tenant: 'tenant-a', role: 'teacher', email: 'teacher.math.demo1@educonnect.test' },
  { tenant: 'tenant-a', role: 'student', email: 'student.a.demo1@educonnect.test' },
  { tenant: 'tenant-a', role: 'parent', email: 'parent.a.demo1@educonnect.test' },
  { tenant: 'tenant-a', role: 'librarian', email: 'librarian.demo1@educonnect.test' },
  { tenant: 'tenant-a', role: 'accountant', email: 'accountant.demo1@educonnect.test' },
  { tenant: 'tenant-a', role: 'principal', email: 'principal.demo1@educonnect.test' },
  { tenant: 'tenant-b', role: 'admin', email: 'admin.demo2@educonnect.test' },
  { tenant: 'tenant-b', role: 'teacher', email: 'teacher.math.demo2@educonnect.test' },
  { tenant: 'tenant-b', role: 'student', email: 'student.a.demo2@educonnect.test' },
  { tenant: 'tenant-b', role: 'parent', email: 'parent.a.demo2@educonnect.test' },
  { tenant: 'tenant-b', role: 'librarian', email: 'librarian.demo2@educonnect.test' },
  { tenant: 'tenant-b', role: 'accountant', email: 'accountant.demo2@educonnect.test' },
  { tenant: 'tenant-b', role: 'principal', email: 'principal.demo2@educonnect.test' },
];

function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Set ${name} before running demo API smoke tests.`);
  }

  return value;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function firstClassId(context: SmokeContext) {
  const classIds = asStringArray(context.profile.classIds);
  return typeof context.profile.classId === 'string'
    ? context.profile.classId
    : classIds[0] || defaultClassByTenant[context.tenant];
}

function firstLinkedStudentId(profile: Record<string, unknown>) {
  return asStringArray(profile.linkedStudentIds)[0];
}

function countRecords(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['records', 'fees', 'payments', 'imported']) {
      const nested = record[key];
      if (Array.isArray(nested)) return nested.length;
    }
  }

  return 0;
}

function apiUrl(path: string) {
  const base = requireEnv('DEMO_API_SMOKE_BASE_URL or API_BASE_URL', apiBaseUrl).replace(/\/$/, '');
  const normalizedPath = base.endsWith('/api') ? path.replace(/^\/api/, '') : path;
  return `${base}${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`;
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function getJson(context: SmokeContext, path: string) {
  const response = await fetch(apiUrl(path), {
    headers: {
      Authorization: `Bearer ${context.token}`,
      'x-school-id': context.tenant,
    },
  });
  const body = await readJson(response);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
}

function pass(context: SmokeContext, module: string, reason: string): SmokeResult {
  return { ok: true, tenant: context.tenant, role: context.role, module, reason };
}

function fail(context: SmokeContext, module: string, reason: string): SmokeResult {
  return { ok: false, tenant: context.tenant, role: context.role, module, reason };
}

function expectCount(
  context: SmokeContext,
  module: string,
  value: unknown,
  minimum = 1
): SmokeResult {
  const actual = countRecords(value);
  if (actual >= minimum) {
    return pass(context, module, `count > 0 (got ${actual})`);
  }

  return fail(context, module, `expected > 0, got ${actual}`);
}

async function checkEndpoint(
  context: SmokeContext,
  module: string,
  path: string,
  minimum = 1
): Promise<SmokeResult> {
  try {
    const body = await getJson(context, path);
    return expectCount(context, module, body, minimum);
  } catch (error) {
    return fail(context, module, error instanceof Error ? error.message : String(error));
  }
}

async function signIn(user: DemoUser): Promise<SmokeContext> {
  const client = createClient(
    requireEnv('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL', supabaseUrl),
    requireEnv('SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY', supabaseAnonKey),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data, error } = await client.auth.signInWithPassword({
    email: user.email,
    password: demoPassword,
  });

  if (error || !data.session || !data.user) {
    throw new Error(error?.message || `Could not sign in ${user.email}`);
  }

  const context: SmokeContext = {
    ...user,
    token: data.session.access_token,
    uid: data.user.id,
    profile: {},
  };

  context.profile = (await getJson(context, '/api/auth/profile')) as Record<string, unknown>;
  return context;
}

async function runRoleSmoke(context: SmokeContext): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const classId = firstClassId(context);
  const linkedStudentId = firstLinkedStudentId(context.profile);

  const profileRole = context.profile.role;
  const profileTenant = context.profile.tenantId || context.profile.schoolId;
  results.push(
    profileRole === context.role && profileTenant === context.tenant
      ? pass(context, 'auth/profile', `role=${context.role} tenant=${context.tenant}`)
      : fail(
          context,
          'auth/profile',
          `expected role=${context.role} tenant=${context.tenant}, got role=${String(
            profileRole
          )} tenant=${String(profileTenant)}`
        )
  );

  results.push(await checkEndpoint(context, 'announcements', '/api/announcements'));
  results.push(await checkEndpoint(context, 'assignments', '/api/assignments'));
  results.push(await checkEndpoint(context, 'library resources', '/api/library/resources'));

  if (context.role === 'student') {
    results.push(
      await checkEndpoint(context, 'attendance history', `/api/attendance/history/${context.uid}`)
    );
    results.push(await checkEndpoint(context, 'fees account', `/api/fees/${context.uid}`));
    results.push(
      await checkEndpoint(context, 'performance records', `/api/performance/${context.uid}`)
    );
  }

  if (context.role === 'parent') {
    if (!linkedStudentId) {
      results.push(fail(context, 'parent portal', 'expected linkedStudentIds > 0, got 0'));
    } else {
      results.push(pass(context, 'parent portal', `linked student ${linkedStudentId}`));
      results.push(
        await checkEndpoint(
          context,
          'parent attendance',
          `/api/attendance/history/${linkedStudentId}`
        )
      );
      results.push(
        await checkEndpoint(
          context,
          'parent assignments',
          `/api/assignments/history/${linkedStudentId}`
        )
      );
      results.push(await checkEndpoint(context, 'parent fees', `/api/fees/${linkedStudentId}`));
      results.push(
        await checkEndpoint(context, 'parent performance', `/api/performance/${linkedStudentId}`)
      );
    }
  }

  if (['admin', 'teacher', 'principal'].includes(context.role)) {
    results.push(await checkEndpoint(context, 'attendance', `/api/attendance?classId=${classId}`));
    results.push(
      await checkEndpoint(context, 'performance report', `/api/performance/report/${classId}`)
    );
  }

  if (['admin', 'accountant', 'principal'].includes(context.role)) {
    results.push(await checkEndpoint(context, 'fees report', `/api/fees/report/${classId}`));
  }

  if (['admin', 'principal'].includes(context.role)) {
    results.push(await checkEndpoint(context, 'users', `/api/users?tenantId=${context.tenant}`));
  }

  return results;
}

function printResult(result: SmokeResult) {
  const prefix = result.ok ? 'PASS' : 'FAIL';
  console.log(`${prefix} ${result.tenant} ${result.role} ${result.module}: ${result.reason}`);
}

async function main() {
  const results: SmokeResult[] = [];

  console.log('Running seeded demo API smoke tests...');

  for (const user of demoUsers) {
    try {
      const context = await signIn(user);
      results.push(...(await runRoleSmoke(context)));
    } catch (error) {
      results.push({
        ok: false,
        tenant: user.tenant,
        role: user.role,
        module: 'auth/sign-in',
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const result of results) {
    printResult(result);
  }

  const failures = results.filter((result) => !result.ok);
  console.log(
    `Demo API smoke complete: ${results.length - failures.length}/${results.length} checks passed.`
  );

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
