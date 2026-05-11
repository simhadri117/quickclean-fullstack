import { MongoClient, Db } from 'mongodb';

const uri = process.env.DATABASE_URL || '';
const client = new MongoClient(uri, {
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 10000,
  family: 4,
});

let db: Db;

export async function connectToDatabase(): Promise<Db> {
  if (db) return db;

  try {
    console.log('📡 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas (Native Driver)');
    db = client.db('quickclean');
    return db;
  } catch (error: any) {
    console.error('❌ MongoDB Connection Error:', {
      message: error.message,
      code: error.code,
      hostname: error.hostname,
      suggestion: 'Please ensure your IP is whitelisted in MongoDB Atlas Network Access and that your network allows DNS SRV queries.'
    });
    // Don't throw here to allow the server to start in "offline/limited" mode if needed, 
    // or keep throwing if the app strictly requires DB. 
    // For now, we throw to let the user know it's a blocker.
    throw error;
  }
}

// Utility to get the db instance synchronously if already connected
export const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase first.');
  }
  return db;
};
