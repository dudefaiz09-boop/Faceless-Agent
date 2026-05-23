const webEnv = [
  'VITE_ENVIRONMENT=${VITE_ENVIRONMENT:-preview}',
  'VITE_DEMO_MODE=${VITE_DEMO_MODE:-true}',
  'VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-https://example.supabase.co}',
  'VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY:-qa-placeholder-anon-key}',
  'VITE_SUPABASE_UPLOADS_BUCKET=${VITE_SUPABASE_UPLOADS_BUCKET:-educonnect-uploads}',
  'VITE_API_BASE_URL=${VITE_API_BASE_URL:-/api}',
].join(' ');

module.exports = {
  ci: {
    collect: {
      startServerCommand:
        process.env.LHCI_START_SERVER_COMMAND ||
        `${webEnv} pnpm --filter @educonnect/web build && ${webEnv} pnpm --filter @educonnect/web preview --host 127.0.0.1 --port 4173`,
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 120000,
      url: [
        'http://127.0.0.1:4173/auth/login',
        'http://127.0.0.1:4173/auth/register',
        'http://127.0.0.1:4173/auth/forgot-password',
      ],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
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
