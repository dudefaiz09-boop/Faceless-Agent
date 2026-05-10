import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin SDK Initialization
 * 
 * In Cloud Functions v2, default credentials and Project ID 
 * are automatically managed by the environment.
 */

if (!getApps().length) {
  initializeApp();
}

export const auth = getAuth();
export const db = getFirestore();

// Use environment variables for flexible routing
export const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
export const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
