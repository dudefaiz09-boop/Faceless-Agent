import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * Database Seeding Script
 * 
 * This script uses the Google Cloud Application Default Credentials (ADC)
 * or the service account key provided via environment variables.
 */

const projectId = process.env.GCP_PROJECT || 'gen-lang-client-0979500227';

if (!getApps().length) {
  initializeApp({
    projectId: projectId,
  });
}

const auth = getAuth();
const db = getFirestore();

console.log(`🚀 Starting Database Seeding for project: ${projectId}`);

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
      
      console.log(`✅ Success: ${user.email}`);
    } catch (error: any) {
      console.error(`❌ Failed: ${user.email} - ${error.message}`);
    }
  }
  console.log('🏁 Seeding Finished.');
  process.exit(0);
}

setup();
