import { Router } from 'express';
import { db } from '../config/firebaseAdmin';

const router = Router();

// Get all available services
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('services').get();
    let services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (services.length === 0) {
      const mockServices = [
        { id: '65f1a2b3c4d5e6f7a8b9c0d1', name: 'Quick Sweep & Mop', price: 149, timeMins: 15, icon: '🧹' },
        { id: '65f1a2b3c4d5e6f7a8b9c0d2', name: 'Kitchen Regular', price: 199, timeMins: 20, icon: '✨' },
        { id: '65f1a2b3c4d5e6f7a8b9c0d3', name: 'Bathroom Wash', price: 249, timeMins: 25, icon: '🛁' },
        { id: '65f1a2b3c4d5e6f7a8b9c0d4', name: 'Post-Party Cleanup', price: 499, timeMins: 45, icon: '🎉' },
      ];
      try {
        const batch = db.batch();
        mockServices.forEach(s => {
          const docRef = db.collection('services').doc(s.id);
          batch.set(docRef, { name: s.name, price: s.price, timeMins: s.timeMins, icon: s.icon });
        });
        await batch.commit();
        services = mockServices;
      } catch (e) {
        console.warn('Returning mock services for prototype.');
        services = mockServices as any;
      }
    }
    res.json(services);
  } catch (error) {
    console.error('🔥 Error fetching services from Firestore:', error);
    // Fallback to mock services so the app doesn't crash if Firestore API is disabled
    const mockServices = [
      { id: '65f1a2b3c4d5e6f7a8b9c0d1', name: 'Quick Sweep & Mop', price: 149, timeMins: 15, icon: '🧹' },
      { id: '65f1a2b3c4d5e6f7a8b9c0d2', name: 'Kitchen Regular', price: 199, timeMins: 20, icon: '✨' },
      { id: '65f1a2b3c4d5e6f7a8b9c0d3', name: 'Bathroom Wash', price: 249, timeMins: 25, icon: '🛁' },
      { id: '65f1a2b3c4d5e6f7a8b9c0d4', name: 'Post-Party Cleanup', price: 499, timeMins: 45, icon: '🎉' },
    ];
    res.json(mockServices);
  }
});

export default router;
