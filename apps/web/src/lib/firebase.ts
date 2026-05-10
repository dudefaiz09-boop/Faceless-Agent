import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase Client SDK Initialization
 * 
 * NOTE: All variables prefixed with VITE_ are injected by Vite at BUILD TIME.
 * If these are missing during the CI build step, the app will fail to initialize.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Fail-fast validation: If the build didn't inject the API key, stop execution immediately.
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined') {
  console.error("FATAL: Firebase API Key is missing. Build-time environment variables were not injected correctly.");
  // We throw here to prevent the app from attempting to call Firebase with a null instance,
  // which causes the internal error: 'e._getRecaptchaConfig is not a function'.
  throw new Error("Firebase Configuration Error: Check VITE_FIREBASE_API_KEY");
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)');

console.log(`[Firebase] Initialized for project: ${firebaseConfig.projectId}`);
