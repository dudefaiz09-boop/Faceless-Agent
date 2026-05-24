const { spawn, spawnSync } = require('node:child_process');

const previewUrl = 'http://127.0.0.1:4173/auth/login';

const env = {
  ...process.env,
  VITE_ENVIRONMENT: process.env.VITE_ENVIRONMENT || 'preview',
  VITE_DEMO_MODE: process.env.VITE_DEMO_MODE || 'true',
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://example.supabase.co',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'qa-placeholder-anon-key',
  VITE_SUPABASE_UPLOADS_BUCKET: process.env.VITE_SUPABASE_UPLOADS_BUCKET || 'educonnect-uploads',
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || '/api',
};

const build = spawnSync('pnpm', ['--filter', '@educonnect/web', 'build'], {
  env,
  shell: true,
  stdio: 'inherit',
});

if (build.status !== 0) {
  process.exit(build.status || 1);
}

const preview = spawn(
  'pnpm',
  ['--filter', '@educonnect/web', 'preview', '--host', '127.0.0.1', '--port', '4173'],
  {
    env,
    shell: true,
    stdio: 'inherit',
  }
);

async function waitForPreview() {
  const deadline = Date.now() + 110000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(previewUrl, { redirect: 'manual' });
      if (response.status > 0) {
        console.log(`LHCI server ready: ${previewUrl}`);
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.error(
    `LHCI server did not become ready at ${previewUrl}: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
  stopPreview('SIGTERM');
  process.exit(1);
}

function stopPreview(signal) {
  if (!preview.killed) {
    preview.kill(signal);
  }
}

process.on('SIGINT', () => stopPreview('SIGINT'));
process.on('SIGTERM', () => stopPreview('SIGTERM'));

preview.on('exit', (code, signal) => {
  if (signal) return;
  process.exit(code || 0);
});

void waitForPreview();
