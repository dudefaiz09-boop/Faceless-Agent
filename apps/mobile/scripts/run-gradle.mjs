import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const tasks = process.argv.slice(2);
if (tasks.length === 0) {
  console.error('Usage: node scripts/run-gradle.mjs <task> [...args]');
  process.exit(1);
}

const androidDir = path.resolve(process.cwd(), 'android');
if (!fs.existsSync(androidDir)) {
  console.error('Android native project is missing: apps/mobile/android');
  process.exit(1);
}

const isWindows = process.platform === 'win32';
const wrapper = isWindows ? 'gradlew.bat' : 'gradlew';
const wrapperPath = path.join(androidDir, wrapper);

if (!fs.existsSync(wrapperPath)) {
  console.error(`Gradle wrapper not found: ${wrapperPath}`);
  console.error('Expected wrapper files: gradlew and gradlew.bat');
  process.exit(1);
}

if (!isWindows) {
  try {
    const stat = fs.statSync(wrapperPath);
    fs.chmodSync(wrapperPath, stat.mode | 0o111);
  } catch {
    // Non-fatal; the build will report a clearer error if the wrapper can't execute.
  }
}

const command = isWindows ? `"${wrapperPath}"` : wrapperPath;
const env = { ...process.env };

// Gradle wrapper scripts expect JAVA_HOME to point to the JDK root, not the bin/ directory.
// Some environments set JAVA_HOME=.../bin which causes Gradle to look for .../bin/bin/java.exe.
if (isWindows && typeof env.JAVA_HOME === 'string') {
  const normalizedJavaHome = env.JAVA_HOME.replace(/\//g, '\\');
  if (normalizedJavaHome.toLowerCase().endsWith('\\bin')) {
    env.JAVA_HOME = path.dirname(normalizedJavaHome);
  }
}

const result = spawnSync(command, tasks, {
  cwd: androidDir,
  stdio: 'inherit',
  shell: isWindows,
  env,
});

process.exit(result.status ?? 1);
