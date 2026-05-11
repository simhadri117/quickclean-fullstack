const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkServices() {
  try {
    console.log('Fetching services...');
    const snapshot = await getDocs(collection(db, 'services'));
    console.log('Found services:', snapshot.size);
    snapshot.forEach(doc => {
      console.log(doc.id, '=>', doc.data());
    });
  } catch (e) {
    console.error('Error fetching services:', e.message);
  }
}

checkServices();
