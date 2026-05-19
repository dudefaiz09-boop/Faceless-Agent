const baseUrl = (process.env.API_BASE_URL || 'http://localhost:8080/api').replace(/\/+$/, '');
const tenantId = process.env.SMOKE_TENANT_ID || 'tenant-a';
const token = process.env.SMOKE_ACCESS_TOKEN || '';

type SmokeCase = {
  name: string;
  path: string;
  headers?: Record<string, string>;
  expect: number[];
};

const cases: SmokeCase[] = [
  { name: 'health', path: '/health', expect: [200] },
  { name: 'ai status', path: '/ai/status', expect: [200] },
  {
    name: 'notifications auth/tenant surface',
    path: '/notifications',
    headers: token ? { Authorization: `Bearer ${token}`, 'x-school-id': tenantId } : {},
    expect: token ? [200, 401, 403] : [400, 401],
  },
  {
    name: 'announcements auth/tenant surface',
    path: '/announcements',
    headers: token ? { Authorization: `Bearer ${token}`, 'x-school-id': tenantId } : {},
    expect: token ? [200, 401, 403] : [400, 401],
  },
];

let failed = false;

for (const testCase of cases) {
  const response = await fetch(`${baseUrl}${testCase.path}`, {
    headers: testCase.headers,
  });

  if (!testCase.expect.includes(response.status)) {
    failed = true;
    console.error(
      `[smoke:web-api] ${testCase.name} expected ${testCase.expect.join('/')} but got ${
        response.status
      }`
    );
  } else {
    console.log(`[smoke:web-api] ${testCase.name}: ${response.status}`);
  }
}

if (failed) {
  process.exitCode = 1;
}
