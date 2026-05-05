const admin = require('firebase-admin');
const serviceAccount = require('c:\\\\Users\\\\bpoor\\\\Downloads\\\\quickclean-808d9-firebase-adminsdk-fbsvc-1e424984fc.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  try {
    // 1. Delete existing
    const snapshot = await db.collection('services').get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    if (snapshot.size > 0) {
      await batch.commit();
      console.log(`Deleted ${snapshot.size} existing services.`);
    }

    // 2. Insert new ones
    const defaultServices = [
      { name: 'Quick Sweep & Mop', price: 149, timeMins: 5, icon: '🧹', imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=400' },
      { name: 'Kitchen Regular', price: 199, timeMins: 10, icon: '✨', imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=400' },
      { name: 'Bathroom Wash', price: 199, timeMins: 10, icon: '🚿', imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400' },
      { name: 'Post-Party Cleanup', price: 499, timeMins: 30, icon: '🎉', imageUrl: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&q=80&w=400' }
    ];

    for (const s of defaultServices) {
      await db.collection('services').add(s);
    }
    console.log('Successfully inserted new services with images.');
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
