import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import dns from 'dns';

// Force use of Google DNS to resolve Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

// Load env from the backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const uri = process.env.DATABASE_URL || '';
if (!uri) {
  console.error('❌ Error: DATABASE_URL not found in .env');
  process.exit(1);
}

const client = new MongoClient(uri);

async function seed() {
  try {
    await client.connect();
    console.log('📡 Connected to MongoDB Atlas for seeding...');
    
    const db = client.db('quickclean');

    // 1. Seed Services
    const servicesCollection = db.collection('services');
    const existingServices = await servicesCollection.countDocuments();
    
    if (existingServices === 0) {
      const services = [
        { _id: new ObjectId(), name: 'Quick Sweep & Mop', price: 149, timeMins: 15, icon: '🧹' },
        { _id: new ObjectId(), name: 'Kitchen Regular', price: 199, timeMins: 20, icon: '✨' },
        { _id: new ObjectId(), name: 'Bathroom Wash', price: 249, timeMins: 25, icon: '🛁' },
        { _id: new ObjectId(), name: 'Post-Party Cleanup', price: 499, timeMins: 45, icon: '🎉' },
      ];
      await servicesCollection.insertMany(services);
      console.log('✅ Services seeded.');
    } else {
      console.log('ℹ️ Services already exist, skipping.');
    }

    // 2. Seed a Sample Partner
    const cleanerCollection = db.collection('cleaners');
    const existingCleaners = await cleanerCollection.countDocuments();
    if (existingCleaners === 0) {
      await cleanerCollection.insertOne({
        name: 'Priya S.',
        phone: '9876543210',
        rating: 4.9,
        cleans: 420,
        createdAt: new Date()
      });
      console.log('✅ Sample Partner seeded.');
    }

    console.log('\n🌟 Seeding complete! You can now refresh your Atlas Dashboard.');
  } catch (error) {
    console.error('❌ Seeding Error:', error);
  } finally {
    await client.close();
  }
}

seed();
