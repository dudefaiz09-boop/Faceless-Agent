import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We want to bundle ONLY workspace packages and their source code.
// EVERYTHING else from node_modules should be external.
const commonConfig = {
  absWorkingDir: __dirname,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  packages: 'external', // This marks all node_modules as external
  sourcemap: true,
  logLevel: 'info',
  // We use this to override 'external' for our workspace packages
  plugins: [
    {
      name: 'bundle-workspace',
      setup(build) {
        // Intercept workspace imports and resolve to their source
        build.onResolve({ filter: /^@educonnect\// }, (args) => {
          const pkgName = args.path.split('/')[1]; // e.g., 'shared-analytics'
          const pkgPath = path.resolve(__dirname, '../../packages', pkgName, 'src/index.ts');
          return { path: pkgPath };
        });
      },
    },
  ],
};

async function runBuild() {
  console.log('🚀 Building EduConnect Functions (Optimized)...');

  try {
    // Build main index
    await esbuild.build({
      ...commonConfig,
      entryPoints: ['./src/index.ts'],
      outfile: path.join(__dirname, 'dist/index.js'),
    });

    // Build standalone
    await esbuild.build({
      ...commonConfig,
      entryPoints: ['./src/standalone.ts'],
      outfile: path.join(__dirname, 'dist/standalone.js'),
    });

    console.log('✅ Build complete!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

runBuild();
