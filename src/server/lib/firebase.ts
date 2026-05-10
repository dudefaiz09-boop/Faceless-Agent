import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

const _dirname = process.cwd();
let firebaseConfig: any = { projectId: 'mock-project' };

try {
  const configPath = path.join(_dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (error) {
  console.error('Error loading Firebase config:', error);
}

const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || firebaseConfig.projectId;

if (!getApps().length) {
  initializeApp({
    projectId: projectId,
  });
  console.log("Firebase Admin initialized for project:", projectId);
}

export const auth = getAuth();
export const db = getFirestore(firebaseConfig.firestoreDatabaseId || '(default)');
export { firebaseConfig, projectId };
