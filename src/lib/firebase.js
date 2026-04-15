import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseReady = Object.values(firebaseConfig).every(Boolean);

let firebaseAuth = null;
let firebaseDb = null;

if (firebaseReady) {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  firebaseAuth = getAuth(app);
  firebaseDb = getFirestore(app);
}

export { firebaseAuth, firebaseDb, firebaseReady };
