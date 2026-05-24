const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const lhciTempDir = path.resolve('.lighthouseci/tmp');
mkdirSync(lhciTempDir, { recursive: true });

const env = {
  ...process.env,
  TMP: lhciTempDir,
  TEMP: lhciTempDir,
  TMPDIR: lhciTempDir,
};

const result = spawnSync('pnpm', ['exec', 'lhci', 'autorun', '--config=./lighthouserc.cjs'], {
  env,
  shell: true,
  stdio: 'inherit',
});

process.exit(result.status || 0);
