import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update, get } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAaAIzYHlQ9Xmho4oMA7sSDz7aEJmI8Avc",
  authDomain: "printmart-bd9da.firebaseapp.com",
  projectId: "printmart-bd9da",
  storageBucket: "printmart-bd9da.firebasestorage.app",
  messagingSenderId: "112273507268",
  appId: "1:112273507268:web:8119878aa05597c963da91",
  measurementId: "G-1PWQHK6307",
  databaseURL: "https://printmart-bd9da-default-rtdb.asia-southeast1.firebasedatabase.app",
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const database = getDatabase(app);

export { ref, onValue, set, update, get };
