import * as esbuild from 'esbuild';
import fs from 'fs';

// We want to bundle ONLY workspace packages and their source code.
// EVERYTHING else from node_modules should be external.
const commonConfig = {
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  packages: 'external', // This marks all node_modules as external
  sourcemap: true,
  logLevel: 'info',
  // We use this to override 'external' for our workspace packages
  plugins: [{
    name: 'bundle-workspace',
    setup(build) {
      // Intercept workspace imports and mark them as NOT external
      build.onResolve({ filter: /^@educonnect\// }, args => {
        // Return null/undefined to let esbuild continue its default resolution
        // but since we want to BUNDLE it, we need to make sure it's not marked external.
        // By returning an empty object with external: false, we force it.
        return { external: false }; 
      });
    },
  }],
};

async function runBuild() {
  console.log('🚀 Building EduConnect Functions (Optimized)...');
  
  try {
    // Build main index
    await esbuild.build({
      ...commonConfig,
      entryPoints: ['src/index.ts'],
      outfile: 'dist/index.js',
    });

    // Build standalone
    await esbuild.build({
      ...commonConfig,
      entryPoints: ['src/standalone.ts'],
      outfile: 'dist/standalone.js',
    });

    console.log('✅ Build complete!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

runBuild();
