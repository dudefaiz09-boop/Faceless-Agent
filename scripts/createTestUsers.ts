import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const auth = admin.auth();
const db = admin.firestore();

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
      } catch (err) {
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
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
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
