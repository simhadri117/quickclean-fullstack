const admin = require('firebase-admin');
const serviceAccount = require('c:\\\\Users\\\\bpoor\\\\Downloads\\\\quickclean-808d9-firebase-adminsdk-fbsvc-1e424984fc.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "quickclean-808d9"
});

const db = admin.firestore();

async function test() {
  try {
    const snapshot = await db.collection('services').get();
    console.log('Services count:', snapshot.size);
    if (snapshot.empty) {
      console.log('Seeding default services...');
      const defaultServices = [
        { name: 'Quick Sweep & Mop', price: 149, timeMins: 10, icon: '🧹' },
        { name: 'Kitchen Regular', price: 199, timeMins: 15, icon: '✨' },
        { name: 'Bathroom Wash', price: 199, timeMins: 15, icon: '🚿' },
        { name: 'Post-Party Cleanup', price: 499, timeMins: 45, icon: '🎉' }
      ];
      for (const s of defaultServices) {
        await db.collection('services').add(s);
      }
      console.log('Seeded successfully!');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
