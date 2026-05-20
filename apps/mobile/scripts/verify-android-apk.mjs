import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const apkPath = path.resolve(
  process.cwd(),
  process.argv[2] || 'android/app/build/outputs/apk/debug/app-debug.apk'
);

const requiredEntries = [
  'lib/arm64-v8a/libhermes.so',
  'lib/arm64-v8a/libhermestooling.so',
  'assets/index.android.bundle',
];

const forbiddenEntryFragments = ['libhermes_executor.so'];
const forbiddenBundlePatterns = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /service[_-]?role/i,
  /https?:\/\/localhost(?::\d+)?(?:\/|["'`]|$)/i,
  /https?:\/\/127\.\d+\.\d+\.\d+(?::\d+)?(?:\/|["'`]|$)/i,
  /https?:\/\/10\.0\.2\.2(?::\d+)?(?:\/|["'`]|$)/i,
];

function fail(message) {
  console.error(`[verify-android-apk] ${message}`);
  process.exitCode = 1;
}

function readUInt32LE(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

function readUInt16LE(buffer, offset) {
  return buffer.readUInt16LE(offset);
}

function findEndOfCentralDirectory(buffer) {
  const signature = 0x06054b50;
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);

  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (readUInt32LE(buffer, offset) === signature) {
      return offset;
    }
  }

  throw new Error('Could not locate ZIP central directory.');
}

function readEntries(buffer) {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const entryCount = readUInt16LE(buffer, eocdOffset + 10);
  let offset = readUInt32LE(buffer, eocdOffset + 16);
  const entries = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (readUInt32LE(buffer, offset) !== 0x02014b50) {
      throw new Error(`Invalid central directory entry at ${offset}.`);
    }

    const compressionMethod = readUInt16LE(buffer, offset + 10);
    const compressedSize = readUInt32LE(buffer, offset + 20);
    const uncompressedSize = readUInt32LE(buffer, offset + 24);
    const nameLength = readUInt16LE(buffer, offset + 28);
    const extraLength = readUInt16LE(buffer, offset + 30);
    const commentLength = readUInt16LE(buffer, offset + 32);
    const localHeaderOffset = readUInt32LE(buffer, offset + 42);
    const nameStart = offset + 46;
    const name = buffer.toString('utf8', nameStart, nameStart + nameLength);

    entries.push({
      name,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    offset = nameStart + nameLength + extraLength + commentLength;
  }

  return entries;
}

function readEntry(buffer, entry) {
  const offset = entry.localHeaderOffset;
  if (readUInt32LE(buffer, offset) !== 0x04034b50) {
    throw new Error(`Invalid local header for ${entry.name}.`);
  }

  const nameLength = readUInt16LE(buffer, offset + 26);
  const extraLength = readUInt16LE(buffer, offset + 28);
  const dataStart = offset + 30 + nameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) {
    return compressed;
  }

  if (entry.compressionMethod === 8) {
    return zlib.inflateRawSync(compressed, { finishFlush: zlib.constants.Z_SYNC_FLUSH });
  }

  throw new Error(`Unsupported compression method ${entry.compressionMethod} for ${entry.name}.`);
}

if (!fs.existsSync(apkPath)) {
  fail(`APK not found: ${apkPath}`);
  process.exit();
}

const apk = fs.readFileSync(apkPath);
const entries = readEntries(apk);
const names = new Set(entries.map((entry) => entry.name));

for (const requiredEntry of requiredEntries) {
  if (!names.has(requiredEntry)) {
    fail(`Missing required APK entry: ${requiredEntry}`);
  }
}

for (const entry of entries) {
  if (forbiddenEntryFragments.some((fragment) => entry.name.includes(fragment))) {
    fail(`Forbidden Hermes executor library is packaged: ${entry.name}`);
  }
}

const bundleEntry = entries.find((entry) => entry.name === 'assets/index.android.bundle');
if (bundleEntry) {
  const bundle = readEntry(apk, bundleEntry).toString('utf8');
  for (const pattern of forbiddenBundlePatterns) {
    if (pattern.test(bundle)) {
      fail(`Forbidden mobile bundle value matched ${pattern}`);
    }
  }
}

if (process.exitCode) {
  process.exit();
}

console.log('[verify-android-apk] OK');
console.log(`[verify-android-apk] ${path.relative(process.cwd(), apkPath)}`);
console.log(`[verify-android-apk] entries=${entries.length}`);
console.log('[verify-android-apk] Hermes libraries and JS bundle are present.');
console.log('[verify-android-apk] libhermes_executor.so is not packaged or referenced by entry name.');
