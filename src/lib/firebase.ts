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

let app;
let auth: any;
let db: any;

try {
  // Use VITE_ prefix for client-side injection via Vite
  config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  // Fallback to a stringified JSON if provided (Standard for AI Studio environments)
  if (!config.apiKey && import.meta.env.VITE_FIREBASE_CONFIG_JSON) {
    try {
      config = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG_JSON);
    } catch (parseError) {
      console.error("VITE_FIREBASE_CONFIG_JSON parse failed:", parseError);
    }
  }

  // Final fallback: Use project project ID from env if others are missing
  if (!config.projectId) {
    config.projectId = import.meta.env.VITE_PROJECT_ID || 'gen-lang-client-0979500227';
  }

  console.log("Firebase config detected for project:", config.projectId);

  if (!config.apiKey) {
    console.warn("CRITICAL: Firebase API Key is missing. Login will fail.");
  }

  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)');
} catch (e) {
  console.error("Firebase Auth initialization failed:", e);
  // Re-throw to allow global error boundary to catch it or let it fail naturally
  throw e;
}

export { auth, db };

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
