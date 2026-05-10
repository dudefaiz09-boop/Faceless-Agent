import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// In AI Studio environments, the config might be provided as a single stringified JSON
// In other environments, individual VITE_ environment variables might be used.
let config: any = {};

try {
  // Priority 1: Individual environment variables (Standard for Vite)
  config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)'
  };

  // Priority 2: Fallback to a stringified JSON if provided
  if (!config.apiKey && import.meta.env.VITE_FIREBASE_CONFIG_JSON) {
    config = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG_JSON);
  }
} catch (e) {
  console.error("Failed to parse Firebase configuration", e);
}

const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app, config.firestoreDatabaseId || '(default)');

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firebase connection test failed. This is expected if you are offline or have incorrect credentials.");
    }
  }
}

if (import.meta.env.DEV) {
  testConnection();
}
