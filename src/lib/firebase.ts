import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, memoryLocalCache, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

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

// Validate connection on startup per Firebase skill specification
async function testConnection() {
  try {
    await getDocFromServer(doc(db, '_health', 'connection'));
  } catch (error: any) {
    // Suppress benign connection closing/hidden/offline warnings in console
    const msg = error?.message || '';
    if (!msg.includes('Database is closing') && !msg.includes('offline')) {
      console.warn("Firestore status notice:", msg);
    }
  }
}
testConnection();

export default app;

