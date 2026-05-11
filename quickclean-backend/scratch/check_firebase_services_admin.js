const admin = require('firebase-admin');
const path = require('path');

// Initialize with a service account or just use the project ID if running locally with auth
// For a quick check, let's try to initialize with the project ID
if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: "quickclean-808d9"
    });
}

const db = admin.firestore();

async function checkServices() {
  try {
    console.log('Fetching services from Firestore (admin)...');
    const snapshot = await db.collection('services').get();
    console.log('Found services:', snapshot.size);
    snapshot.forEach(doc => {
      console.log(doc.id, '=>', doc.data());
    });
  } catch (e) {
    console.error('Error fetching services:', e.message);
  }
}

checkServices();
