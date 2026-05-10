import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

let app;
let auth: any;
let db: any;

// Use VITE_ prefix for client-side injection via Vite
const viteConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let finalConfig: any = { ...viteConfig };

// Fallback to a stringified JSON if provided
if (!finalConfig.apiKey && import.meta.env.VITE_FIREBASE_CONFIG_JSON) {
  const rawJSON = import.meta.env.VITE_FIREBASE_CONFIG_JSON;
  try {
    finalConfig = JSON.parse(rawJSON);
  } catch (e) {
    console.warn("VITE_FIREBASE_CONFIG_JSON is malformed. Attempting recovery...");
    try {
      const fixedJSON = rawJSON
        .replace(/'/g, '"')
        .replace(/(\w+):/g, '"$1":');
      finalConfig = JSON.parse(fixedJSON);
    } catch (recoveryError) {
      console.error("Firebase config recovery failed.");
    }
  }
}

// Final fallback: Use project ID from env if missing
if (!finalConfig.projectId) {
  finalConfig.projectId = import.meta.env.VITE_PROJECT_ID || 'gen-lang-client-0979500227';
}

try {
  if (!finalConfig.apiKey) {
    console.warn("CRITICAL: Firebase API Key is missing. Initializing with partial config.");
  }
  app = initializeApp(finalConfig);
  auth = getAuth(app);
  db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)');
} catch (e) {
  console.error("Firebase initialization failed:", e);
  // Re-initialize with placeholder to prevent top-level undefined exports
  app = initializeApp({ apiKey: "mock", projectId: finalConfig.projectId });
  auth = getAuth(app);
  db = getFirestore(app);
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
