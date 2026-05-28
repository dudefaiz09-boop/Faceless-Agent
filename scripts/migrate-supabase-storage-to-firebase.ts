#!/usr/bin/env tsx
/**
 * Migration Script: Supabase Storage → Firebase Storage
 *
 * Usage:
 *   pnpm tsx scripts/migrate-supabase-storage-to-firebase.ts --dry-run
 *   pnpm tsx scripts/migrate-supabase-storage-to-firebase.ts --execute
 *
 * Required env vars (can be in .env at project root):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 *   FIREBASE_STORAGE_BUCKET
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as admin from 'firebase-admin';
import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isExecute = args.includes('--execute');

if (!isDryRun && !isExecute) {
  console.error('Usage: pnpm tsx scripts/migrate-supabase-storage-to-firebase.ts [--dry-run | --execute]');
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID!;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL!;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!;
const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET!;
const SUPABASE_UPLOADS_BUCKET = process.env.SUPABASE_UPLOADS_BUCKET || 'educonnect-uploads';

for (const [name, val] of Object.entries({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET })) {
  if (!val) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId: FIREBASE_PROJECT_ID, clientEmail: FIREBASE_CLIENT_EMAIL, privateKey: FIREBASE_PRIVATE_KEY }),
  });
}

const firebaseBucket = admin.storage().bucket(FIREBASE_STORAGE_BUCKET);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentRow {
  collection: string;
  id: string;
  data: Record<string, unknown>;
  storage_provider: string | null;
  storage_bucket: string | null;
  storage_key: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  original_filename: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
}

function buildFirebaseKey(doc: DocumentRow): string {
  const tenantId = (doc.data.tenantId || doc.data.schoolId || 'unknown') as string;
  const module = (doc.data.module || doc.collection || 'documents') as string;
  const entityId = (doc.data.entityId || doc.data.assignmentId || 'general') as string;
  const filename = sanitizeFilename(doc.original_filename || doc.storage_key?.split('/').pop() || 'file');
  return `schools/${tenantId}/${module}/${entityId}/${randomUUID()}-${filename}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n🔄 Supabase → Firebase Storage Migration`);
  console.log(`   Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'EXECUTE (files will be moved)'}`);
  console.log(`   Supabase bucket: ${SUPABASE_UPLOADS_BUCKET}`);
  console.log(`   Firebase bucket: ${FIREBASE_STORAGE_BUCKET}\n`);

  // Fetch all documents using Supabase Storage
  const { data: docs, error } = await supabase
    .from('documents')
    .select('collection, id, data, storage_provider, storage_bucket, storage_key, mime_type, file_size_bytes, original_filename')
    .eq('storage_provider', 'supabase');

  if (error) {
    console.error('Failed to fetch documents:', error.message);
    process.exit(1);
  }

  const rows = (docs || []) as DocumentRow[];
  console.log(`📋 Found ${rows.length} document(s) using Supabase Storage.\n`);

  if (rows.length === 0) {
    console.log('✅ Nothing to migrate.');
    return;
  }

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of rows) {
    const supabaseKey = doc.storage_key;
    if (!supabaseKey) {
      console.warn(`⚠️  Skipping doc ${doc.id}: no storage_key`);
      skipped++;
      continue;
    }

    const firebaseKey = buildFirebaseKey(doc);
    console.log(`📄 Doc ${doc.id}`);
    console.log(`   Supabase key: ${supabaseKey}`);
    console.log(`   Firebase key: ${firebaseKey}`);

    if (isDryRun) {
      console.log(`   [DRY RUN] Would migrate.`);
      success++;
      continue;
    }

    try {
      // Download from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(SUPABASE_UPLOADS_BUCKET)
        .download(supabaseKey);

      if (downloadError || !fileData) {
        throw new Error(`Download failed: ${downloadError?.message || 'no data'}`);
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());

      // Upload to Firebase Storage
      const file = firebaseBucket.file(firebaseKey);
      await file.save(buffer, {
        metadata: {
          contentType: doc.mime_type || 'application/octet-stream',
        },
      });

      // Update metadata row in Supabase
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          storage_provider: 'firebase',
          storage_bucket: FIREBASE_STORAGE_BUCKET,
          storage_key: firebaseKey,
          updated_at: new Date().toISOString(),
        })
        .eq('id', doc.id)
        .eq('collection', doc.collection);

      if (updateError) {
        throw new Error(`Metadata update failed: ${updateError.message}`);
      }

      console.log(`   ✅ Migrated successfully.`);
      success++;
    } catch (err: any) {
      console.error(`   ❌ Failed: ${err.message}`);
      failed++;
    }

    console.log();
  }

  console.log(`\n📊 Summary`);
  console.log(`   ✅ Success:  ${success}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Failed:   ${failed}`);

  if (isDryRun) {
    console.log(`\n💡 Run with --execute to apply changes.`);
  } else {
    console.log(`\n⚠️  Old Supabase Storage files were NOT deleted.`);
    console.log(`   Delete them manually when you're confident the migration was successful.`);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
