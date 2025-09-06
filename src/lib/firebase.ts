// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAA5VpNhybcjP5tn6QhiLT59b4rbR8pT2A",
  authDomain: "careerforge-ai-fcryd.firebaseapp.com",
  projectId: "careerforge-ai-fcryd",
  storageBucket: "careerforge-ai-fcryd.firebasestorage.app",
  messagingSenderId: "1018114730925",
  appId: "1:1018114730925:web:6965547c35e02aeb750f24"
};

// Initialize Firebase for SSR
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
