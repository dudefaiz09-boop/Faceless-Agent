import * as esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';

const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

async function build() {
  const entryPoints = ['src/index.ts'];

  // Find all .ts files in src/hooks and src/services to ensure they are also entry points
  // if we want to keep them as separate files, or we just bundle everything into index.js

  await esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node', // or 'browser' depending on the package, but 'node' is safer for shared
    format: 'esm',
    outfile: 'dist/index.js',
    sourcemap: true,
    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {}),
      '@educonnect/*',
      '@tanstack/*',
      'react',
      'react-dom',
    ],
  });

  console.log(`✅ ${pkg.name} built successfully.`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
