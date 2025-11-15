const { MongoClient } = require('mongodb');

async function createIndexes() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db(process.env.MONGO_DB_NAME);

    // Users Collection
    await db.collection('users').createIndex({ emailLower: 1 }, { unique: true });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });

    // Sessions Collection
    await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    console.log('Indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  } finally {
    await client.close();
  }
}

createIndexes();
