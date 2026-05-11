import { Router } from 'express';
import { getDb } from '../config/mongodb';
import { ObjectId } from 'mongodb';

const router = Router();

// Get all available services
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection('services');
    
    let services = await collection.find({}).toArray();
    
    if (services.length === 0) {
      const mockServices = [
        { _id: new ObjectId('65f1a2b3c4d5e6f7a8b9c0d1'), name: 'Quick Sweep & Mop', price: 149, timeMins: 15, icon: '🧹' },
        { _id: new ObjectId('65f1a2b3c4d5e6f7a8b9c0d2'), name: 'Kitchen Regular', price: 199, timeMins: 20, icon: '✨' },
        { _id: new ObjectId('65f1a2b3c4d5e6f7a8b9c0d3'), name: 'Bathroom Wash', price: 249, timeMins: 25, icon: '🛁' },
        { _id: new ObjectId('65f1a2b3c4d5e6f7a8b9c0d4'), name: 'Post-Party Cleanup', price: 499, timeMins: 45, icon: '🎉' },
      ];
      try {
        await collection.insertMany(mockServices);
        services = await collection.find({}).toArray();
      } catch (e) {
        console.warn('Returning mock services for prototype.');
        services = mockServices as any;
      }
    }
    res.json(services.map(s => ({ ...s, id: s._id.toString() })));
  } catch (error) {
    console.error('🔥 Error fetching services from MongoDB:', error);
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
