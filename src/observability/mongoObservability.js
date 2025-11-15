const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

function instrumentMongoDB(client) {
  const originalCommand = client.db().command;

  client.db().command = async function (command, options) {
    const start = process.hrtime.bigint();
    try {
      const result = await originalCommand.call(this, command, options);
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e6; // Convert to milliseconds
      console.log(
        `MongoDB Command: ${JSON.stringify(command)}, Duration: ${duration.toFixed(2)}ms`,
      );
      return result;
    } catch (error) {
      console.error(`MongoDB Command Error: ${JSON.stringify(command)}, Error: ${error.message}`);
      throw error;
    }
  };
}

async function setupMongoObservability() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    instrumentMongoDB(client);

    const db = client.db(process.env.MONGO_DB_NAME);

    // Example query to test observability
    await db.collection('users').findOne({});
  } catch (error) {
    console.error('Error setting up MongoDB observability:', error);
  } finally {
    await client.close();
  }
}

setupMongoObservability();
