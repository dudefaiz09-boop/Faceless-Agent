import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const API_BASE = 'http://localhost:3000/api';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestUser {
  email: string;
  name: string;
  classId: string;
}

const testUsers: TestUser[] = [
  { email: 'admin.demo1@educonnect.test', name: 'Tenant 1 (Demo Academy) Admin', classId: 'A1' },
];

async function runTests() {
  console.log('=== Starting API & Storage Verification Tests ===\n');

  for (const user of testUsers) {
    console.log(`Testing login for: ${user.name} (${user.email})...`);
    
    // 1. Authenticate via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: 'Test@123456',
    });

    if (authError || !authData.session) {
      console.error(`❌ Login failed for ${user.email}:`, authError?.message || 'No session returned');
      continue;
    }

    const token = authData.session.access_token;
    const schoolId = authData.user.app_metadata?.schoolId;
    console.log(`✅ Login successful! schoolId (JWT app_metadata): ${schoolId}`);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // 2. Test Endpoints
    const endpoints = [
      { name: 'Announcements', url: `${API_BASE}/announcements` },
      { name: 'Assignments', url: `${API_BASE}/assignments` },
      { name: 'Attendance', url: `${API_BASE}/attendance?classId=${user.classId}` },
      { name: 'Fees Report', url: `${API_BASE}/fees/report/${user.classId}` },
      { name: 'Performance Report', url: `${API_BASE}/performance/report/${user.classId}` },
      { name: 'Library Resources', url: `${API_BASE}/library/resources` },
    ];

    console.log('\n--- Querying API Endpoints ---');
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint.url, { headers });
        if (!res.ok) {
          const body = await res.text();
          console.error(`❌ ${endpoint.name} endpoint failed (${res.status}): ${body}`);
          continue;
        }

        const data: any = await res.json();
        let itemCount = '';
        if (Array.isArray(data)) {
          itemCount = `Array of ${data.length}`;
        } else if (data && typeof data === 'object') {
          if (data.records && Array.isArray(data.records)) {
            itemCount = `Object (records count: ${data.records.length})`;
          } else {
            itemCount = `Object keys: ${Object.keys(data).join(', ')}`;
          }
        } else {
          itemCount = String(data);
        }
        
        console.log(`✅ ${endpoint.name} loaded successfully! Format: ${itemCount}`);
      } catch (err: any) {
        console.error(`❌ Failed to fetch ${endpoint.name}:`, err.message);
      }
    }

    // 3. Test Storage Bucket Upload and Delete
    console.log('\n--- Testing Supabase Storage Bucket Access ---');
    const bucketName = 'educonnect-uploads';
    const filePath = `test-folder/test-file-${Date.now()}.txt`;
    const fileContent = 'Hello from EduConnect automated verification!';

    try {
      // Authenticate the supabase instance using the session JWT
      const authenticatedSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });

      console.log(`Uploading test file "${filePath}" to bucket "${bucketName}"...`);
      const { data: uploadData, error: uploadError } = await authenticatedSupabase.storage
        .from(bucketName)
        .upload(filePath, fileContent, {
          contentType: 'text/plain',
          upsert: true,
        });

      if (uploadError) {
        console.error(`❌ Storage Upload Failed:`, uploadError.message);
      } else {
        console.log(`✅ Storage Upload Succeeded! Path: ${uploadData.path}`);

        // Try downloading/selecting the file
        console.log('Downloading uploaded file content to verify SELECT policy...');
        const { data: downloadData, error: downloadError } = await authenticatedSupabase.storage
          .from(bucketName)
          .download(filePath);

        if (downloadError) {
          console.error(`❌ Storage Download Failed:`, downloadError.message);
        } else {
          const text = await downloadData.text();
          console.log(`✅ Storage Download Succeeded! Content: "${text}"`);
        }

        // Clean up: delete the file
        console.log('Deleting test file to verify DELETE policy...');
        const { error: deleteError } = await authenticatedSupabase.storage
          .from(bucketName)
          .remove([filePath]);

        if (deleteError) {
          console.error(`❌ Storage Delete Failed:`, deleteError.message);
        } else {
          console.log('✅ Storage Delete Succeeded! Cleaned up successfully.');
        }
      }
    } catch (storageErr: any) {
      console.error('❌ Storage operations failed:', storageErr.message);
    }

    // Sign out to clean up session
    await supabase.auth.signOut();
    console.log('\n----------------------------------------\n');
  }

  console.log('=== Verification Finished ===');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
