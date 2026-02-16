// ============================================================
// SMART NAVIGATION FILTER — Firebase Configuration
// ============================================================
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAqpH0zW_gaYvcx7YpOW76fpU0Q4mDwV8A",
  authDomain: "smart-navigation-filter.firebaseapp.com",
  projectId: "smart-navigation-filter",
  storageBucket: "smart-navigation-filter.firebasestorage.app",
  messagingSenderId: "842666228265",
  appId: "1:842666228265:web:d841427b0f878a7cfc3a38"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
