const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
if (!uri) {
  throw new Error('❌ MONGO_URI is not defined');
}

let client = null;
let db = null;
let connectingPromise = null;

/**
 * Ensure MongoDB connection (singleton)
 */
async function ensureConnected() {
  if (db) return db;

  if (!connectingPromise) {
    connectingPromise = (async () => {
      client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await client.connect();
      db = client.db();
      console.log('✅ MongoDB connected');
      return db;
    })().catch(err => {
      connectingPromise = null;
      throw err;
    });
  }

  return connectingPromise;
}

/**
 * Generic helpers (same API as before)
 */

async function findAll(collectionName, query = {}, options = {}) {
  const database = await ensureConnected();
  return database.collection(collectionName).find(query, options).toArray();
}

async function findOne(collectionName, filter = {}, options = {}) {
  const database = await ensureConnected();
  return database.collection(collectionName).findOne(filter, options);
}

async function insertOne(collectionName, doc) {
  const database = await ensureConnected();
  const r = await database.collection(collectionName).insertOne(doc);
  return { ...doc, _id: r.insertedId };
}

async function updateOne(collectionName, filter, update) {
  const database = await ensureConnected();
  await database
    .collection(collectionName)
    .updateOne(filter, { $set: update });
  return database.collection(collectionName).findOne(filter);
}

async function deleteOne(collectionName, filter) {
  const database = await ensureConnected();
  await database.collection(collectionName).deleteOne(filter);
  return { deleted: true };
}

/**
 * Graceful shutdown (PM2 safe)
 */
async function close() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    connectingPromise = null;
    console.log('🛑 MongoDB disconnected');
  }
}

module.exports = {
  // connection
  ensureConnected,
  close,

  // CRUD helpers (same as before)
  findAll,
  findOne,
  insertOne,
  updateOne,
  deleteOne,
};
