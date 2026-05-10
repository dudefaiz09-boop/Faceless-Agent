import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../firebase-applet-config.json');
let firebaseConfig: any = {};

try {
  if (fs.existsSync(configPath)) {
    const rawConfig = fs.readFileSync(configPath, 'utf8');
    try {
      firebaseConfig = JSON.parse(rawConfig);
    } catch (parseError) {
      console.warn('⚠️ Warning: firebase-applet-config.json is malformed JSON. Trying to fix common issues...');
      // Try to fix common issues like single quotes or unquoted keys
      try {
        const fixedJSON = rawConfig
          .replace(/'/g, '"') // Replace single quotes with double quotes
          .replace(/(\w+):/g, '"$1":'); // Quote unquoted keys
        firebaseConfig = JSON.parse(fixedJSON);
        console.log('✅ Recovered JSON successfully.');
      } catch (e) {
        console.error('❌ Failed to recover JSON configuration.');
      }
    }
  }
} catch (error) {
  console.error('Error reading Firebase config file:', error);
}

if (!getApps().length) {
  const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || firebaseConfig.projectId || 'gen-lang-client-0979500227';
  initializeApp({
    projectId: projectId,
  });
  console.log(`🚀 Using project: ${projectId}`);
}

const auth = getAuth();
const db = getFirestore();

const TEST_USERS = [
  {
    email: 'student.a@educonnect.test',
    password: 'Test@1234',
    displayName: 'Student A',
    claims: {
      roles: ['student'],
      isAdmin: false,
      classId: '10A',
      permissions: { submitAssignments: true, viewOwnRecords: true }
    }
  },
  {
    email: 'student.b@educonnect.test',
    password: 'Test@1234',
    displayName: 'Student B',
    claims: {
      roles: ['student'],
      isAdmin: false,
      classId: '10B',
      permissions: { submitAssignments: true, viewOwnRecords: true }
    }
  },
  {
    email: 'teacher.a@educonnect.test',
    password: 'Teach@1234',
    displayName: 'Teacher A',
    claims: {
      roles: ['teacher'],
      isAdmin: true,
      permissions: {
        manageStudents: true,
        manageAnnouncements: true,
        manageAttendance: true,
        manageAssignments: true,
        managePerformance: true,
        financialOps: false
      }
    }
  },
  {
    email: 'teacher.b@educonnect.test',
    password: 'Teach@1234',
    displayName: 'Teacher B',
    claims: {
      roles: ['teacher'],
      isAdmin: true,
      permissions: {
        manageStudents: true,
        manageAnnouncements: true,
        manageAttendance: true,
        manageAssignments: true,
        managePerformance: true,
        financialOps: false
      }
    }
  },
  {
    email: 'principal@educonnect.test',
    password: 'Principal@1234',
    displayName: 'School Principal',
    claims: {
      roles: ['staff', 'principal'],
      isAdmin: true,
      permissions: {
        manageStudents: true,
        manageTeachers: true,
        manageAnnouncements: true,
        manageAttendance: true,
        manageFees: true,
        manageLibrary: true,
        manageAssignments: true,
        managePerformance: true,
        financialOps: true
      }
    }
  }
];

async function setup() {
  console.log('🚀 Starting Staging Account Creation...');
  
  for (const user of TEST_USERS) {
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(user.email);
        console.log(`Updating existing user: ${user.email}`);
        await auth.updateUser(userRecord.uid, {
          password: user.password,
          displayName: user.displayName,
          emailVerified: true,
        });
      } catch {
        userRecord = await auth.createUser({
          email: user.email,
          password: user.password,
          displayName: user.displayName,
          emailVerified: true,
        });
        console.log(`Created new user: ${user.email}`);
      }

      await auth.setCustomUserClaims(userRecord.uid, user.claims);
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: user.email,
        displayName: user.displayName,
        roles: user.claims.roles,
        isAdmin: user.claims.isAdmin,
        classId: (user.claims as any).classId || null,
        permissions: user.claims.permissions,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log(`✅ Success for ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed for ${user.email}:`, error);
    }
  }
  console.log('🏁 Staging Setup Finished.');
  process.exit(0);
}

setup();
