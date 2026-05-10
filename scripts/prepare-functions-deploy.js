import fs from 'fs';
import path from 'path';

const functionsPkgPath = path.resolve('apps/functions/package.json');
const pkg = JSON.parse(fs.readFileSync(functionsPkgPath, 'utf8'));

console.log('🧹 Stripping workspace dependencies for deployment...');

if (pkg.devDependencies) {
  Object.keys(pkg.devDependencies).forEach(key => {
    if (key.startsWith('@educonnect/')) {
      delete pkg.devDependencies[key];
    }
  });
}

if (pkg.dependencies) {
  Object.keys(pkg.dependencies).forEach(key => {
    if (key.startsWith('@educonnect/')) {
      delete pkg.dependencies[key];
    }
  });
}

fs.writeFileSync(functionsPkgPath, JSON.stringify(pkg, null, 2));
console.log('✅ package.json cleaned.');
