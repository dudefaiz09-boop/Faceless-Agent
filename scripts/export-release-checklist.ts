import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const outputDir = join(process.cwd(), 'audit/generated');

const rows = [
  ['phase', 'area', 'check', 'command_or_evidence', 'required_before_release'],
  [
    'environment',
    'web',
    'Vercel web env vars are configured',
    'VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY',
    'yes',
  ],
  [
    'environment',
    'api',
    'Vercel API env vars are configured',
    'SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CORS_ORIGINS',
    'yes',
  ],
  [
    'environment',
    'mobile',
    'Android public env vars are configured',
    'API_BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY',
    'yes',
  ],
  ['quality', 'repo', 'Format check passes', 'pnpm format:check', 'yes'],
  ['quality', 'repo', 'Lint passes', 'pnpm lint', 'yes'],
  ['quality', 'repo', 'Tests pass', 'pnpm test', 'yes'],
  ['build', 'web', 'Web build passes', 'pnpm --filter @educonnect/web build', 'yes'],
  ['build', 'api', 'API build passes', 'pnpm --filter @educonnect/functions build', 'yes'],
  ['build', 'mobile', 'Mobile lint passes', 'pnpm --filter mobile lint', 'yes'],
  ['build', 'mobile', 'Mobile tests pass', 'pnpm --filter mobile test', 'yes'],
  ['build', 'android', 'Debug APK builds', 'pnpm --filter mobile build:android', 'yes'],
  [
    'demo',
    'seed',
    'Demo data is seeded and verified',
    'pnpm --filter @educonnect/functions demo:ready',
    'yes',
  ],
  ['smoke', 'api', 'API smoke test passes', 'pnpm smoke:web-api', 'yes'],
  ['qa', 'web', 'Web QA matrix generated', 'pnpm qa:web-matrix', 'yes'],
  [
    'qa',
    'roles',
    'Role-by-role demo QA is complete',
    'docs/PHASE_6_WEB_PRODUCT_QA_RUNBOOK.md',
    'yes',
  ],
  ['qa', 'android', 'APK installed and core flows tested on device', 'manual evidence', 'yes'],
  [
    'release',
    'github',
    'No open critical PRs or release-blocking issues remain',
    'GitHub PR/Issues review',
    'yes',
  ],
  [
    'release',
    'vercel',
    'Vercel failures are not build-rate-limit-only or are accepted',
    'Vercel status evidence',
    'yes',
  ],
];

function csv(values: string[][]) {
  return values
    .map((row) =>
      row
        .map((value) =>
          value.includes(',') || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value
        )
        .join(',')
    )
    .join('\n');
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, 'release-readiness-checklist.csv');
  await writeFile(outputPath, `${csv(rows)}\n`);
  console.log(`Generated ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
