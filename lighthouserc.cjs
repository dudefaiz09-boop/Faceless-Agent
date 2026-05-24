const path = require('node:path');

const chromeUserDataDir = path.resolve('.lighthouseci/chrome-user-data').replace(/\\/g, '/');

module.exports = {
  ci: {
    collect: {
      startServerCommand:
        process.env.LHCI_START_SERVER_COMMAND || 'node scripts/lhci-start-server.cjs',
      startServerReadyPattern: 'LHCI server ready',
      startServerReadyTimeout: 120000,
      url: [
        'http://127.0.0.1:4173/auth/login',
        'http://127.0.0.1:4173/auth/register',
        'http://127.0.0.1:4173/auth/forgot-password',
      ],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        chromeFlags: `--user-data-dir=${chromeUserDataDir}`,
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.5 }],
        'categories:accessibility': ['error', { minScore: 0.85 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'color-contrast': 'warn',
        'unused-javascript': 'off',
        'uses-long-cache-ttl': 'off',
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './qa/results/lighthouse',
    },
  },
};
