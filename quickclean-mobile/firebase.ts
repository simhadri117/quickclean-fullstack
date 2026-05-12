import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCh5mbuxSJjimz7pFOnj1cx9IVpAQj4dRo",
  authDomain: "quickclean-808d9.firebaseapp.com",
  projectId: "quickclean-808d9",
  storageBucket: "quickclean-808d9.firebasestorage.app",
  messagingSenderId: "440258467095",
  appId: "1:440258467095:web:242a4526c344a03bcc9352",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
