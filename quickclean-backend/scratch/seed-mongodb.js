const { MongoClient } = require('mongodb');
const dns = require('dns');
dns.setServers(['8.8.8.8']);
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();

const uri = process.env.DATABASE_URL;
if (!uri) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const client = new MongoClient(uri, { family: 4 });

const DEFAULT_SERVICES = [
  { name: 'Quick Sweep & Mop', price: 149, timeMins: 15, icon: '🧹', imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=400' },
  { name: 'Kitchen Regular', price: 199, timeMins: 20, icon: '✨', imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=400' },
  { name: 'Bathroom Wash', price: 249, timeMins: 25, icon: '🚿', imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400' },
  { name: 'Post-Party Cleanup', price: 499, timeMins: 45, icon: '🎉', imageUrl: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&q=80&w=400' }
];

const DEFAULT_CLEANERS = [
  { name: 'Priya S.', phone: '9876543210', rating: 4.9, cleans: 420, status: 'AVAILABLE' },
  { name: 'Arjun K.', phone: '9876543211', rating: 4.7, cleans: 150, status: 'AVAILABLE' },
  { name: 'Deepa R.', phone: '9876543212', rating: 4.8, cleans: 280, status: 'AVAILABLE' }
];

async function seed() {
  try {
    console.log('📡 Connecting to MongoDB Atlas...');
    await client.connect();
    const db = client.db('quickclean');

    // 1. Seed Services
    console.log('🧹 Seeding services...');
    await db.collection('services').deleteMany({});
    await db.collection('services').insertMany(DEFAULT_SERVICES);
    console.log('✅ Services seeded.');

    // 2. Seed Cleaners
    console.log('🧑‍🔧 Seeding cleaners...');
    await db.collection('cleaners').deleteMany({});
    await db.collection('cleaners').insertMany(DEFAULT_CLEANERS);
    console.log('✅ Cleaners seeded.');

    console.log('🌟 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await client.close();
  }
}

seed();
