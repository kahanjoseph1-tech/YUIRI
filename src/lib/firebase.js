import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyApauIJJARHLIgpPf1EMW1KCzP-_-D8yf0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "yuiri-1f4d3.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "yuiri-1f4d3",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "yuiri-1f4d3.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "188268382869",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:188268382869:web:dcd6d93a99b571652e299c",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
