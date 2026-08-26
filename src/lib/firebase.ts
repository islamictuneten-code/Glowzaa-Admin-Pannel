import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, memoryLocalCache, setLogLevel } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import rawConfig from '../../firebase-applet-config.json';

// Set Firestore log level to suppress non-fatal transient connection warnings
setLogLevel('error');

export const firebaseConfig = {
  projectId: rawConfig?.projectId || (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0254663574",
  appId: rawConfig?.appId || (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:47279804583:web:ec91702686ba5c179b8b82",
  apiKey: rawConfig?.apiKey || (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyDGiPTbGfeT2pEaML-yX05jS4QFjlPtEXY",
  authDomain: rawConfig?.authDomain || (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0254663574.firebaseapp.com",
  firestoreDatabaseId: rawConfig?.firestoreDatabaseId || (import.meta as any).env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-nexusb2bcommerce-f2304aa8-0653-4d35-bac3-8b4986b44505",
  storageBucket: rawConfig?.storageBucket || (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0254663574.firebasestorage.app",
  messagingSenderId: rawConfig?.messagingSenderId || (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "47279804583",
  measurementId: rawConfig?.measurementId || (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || "",
  oAuthClientId: rawConfig?.oAuthClientId || (import.meta as any).env?.VITE_FIREBASE_OAUTH_CLIENT_ID || "",
  recaptchaSiteKey: rawConfig?.recaptchaSiteKey || (import.meta as any).env?.VITE_FIREBASE_RECAPTCHA_SITE_KEY || ""
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Initialize Cloud Firestore with robust fallback
let firestoreInstance;
try {
  const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

  firestoreInstance = databaseId
    ? initializeFirestore(app, { localCache: memoryLocalCache() }, databaseId)
    : initializeFirestore(app, { localCache: memoryLocalCache() });
} catch (e) {
  console.warn("initializeFirestore fallback to getFirestore:", e);
  const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;
  firestoreInstance = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
}

export const db = firestoreInstance;

export default app;


