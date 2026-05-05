import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC6MNNkVqD6p7vFJeNJm05-3tKlw5UiOSo",
  authDomain: "quickclean-808d9.firebaseapp.com",
  projectId: "quickclean-808d9",
  storageBucket: "quickclean-808d9.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
