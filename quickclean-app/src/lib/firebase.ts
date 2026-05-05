import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCh5mbuxSJjimz7pFOnj1cx9IVpAQj4dRo",
  authDomain: "quickclean-808d9.firebaseapp.com",
  databaseURL: "https://quickclean-808d9-default-rtdb.firebaseio.com",
  projectId: "quickclean-808d9",
  storageBucket: "quickclean-808d9.firebasestorage.app",
  messagingSenderId: "440258467095",
  appId: "1:440258467095:web:242a4526c344a03bcc9352",
  measurementId: "G-B217Z9KJLT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, storage, googleProvider };
