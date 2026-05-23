import { readFile } from 'node:fs/promises';

const checks = [
  {
    file: 'apps/web/src/pages/Library.tsx',
    allowedImports: ["import { libraryService } from '../lib/api-client';"],
    discouragedPatterns: ['apiClient.request'],
    serviceName: 'libraryService',
  },
  {
    file: 'apps/web/src/pages/ParentPortal.tsx',
    allowedImports: ["import { parentPortalService } from '../lib/api-client';"],
    discouragedPatterns: ['apiClient.request'],
    serviceName: 'parentPortalService',
  },
];

async function main() {
  let failures = 0;

  for (const check of checks) {
    const content = await readFile(check.file, 'utf8');
    const hasServiceImport = check.allowedImports.some((line) => content.includes(line));
    const discouragedHits = check.discouragedPatterns.filter((pattern) =>
      content.includes(pattern)
    );

    console.log(`\n${check.file}`);
    console.log(`- shared service import: ${hasServiceImport ? 'yes' : 'no'}`);
    console.log(`- expected service: ${check.serviceName}`);

    if (discouragedHits.length > 0) {
      console.log(`- raw boundary patterns: ${discouragedHits.join(', ')}`);
      failures += 1;
    } else {
      console.log('- raw boundary patterns: none');
    }
  }

  if (failures > 0) {
    console.error(
      '\nShared API boundary audit found raw page-level API calls. Migrate page calls to shared-api services before marking Phase 13 complete.'
    );
    process.exitCode = 1;
    return;
  }

  console.log('\nShared API boundary audit passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
