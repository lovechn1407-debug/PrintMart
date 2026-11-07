import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase, Database, ref, get, set, update, onValue, remove } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAaAIzYHlQ9Xmho4oMA7sSDz7aEJmI8Avc",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "printmart-bd9da.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "printmart-bd9da",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "printmart-bd9da.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "112273507268",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:112273507268:web:8119878aa05597c963da91",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-1PWQHK6307",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://printmart-bd9da-default-rtdb.asia-southeast1.firebasedatabase.app",
};

export const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);
export const database: Database = getDatabase(app);
export const googleProvider: GoogleAuthProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export { ref, get, set, update, onValue, remove };
