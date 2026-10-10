// firebase.js: connects to Firebase (Auth + Firestore). Storage is not used.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// Config values come from .env (VITE_FIREBASE_*), see .env.example
const e = import.meta.env;
const app = initializeApp({
  apiKey: e.VITE_FIREBASE_API_KEY, authDomain: e.VITE_FIREBASE_AUTH_DOMAIN, projectId: e.VITE_FIREBASE_PROJECT_ID,
  appId: e.VITE_FIREBASE_APP_ID,
});
// Shared handles imported by the rest of the app
export const auth = getAuth(app), db = getFirestore(app);
