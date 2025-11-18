const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI || null;

let client = null;
let db = null;
let connected = false;

async function connect() {
  if (!uri) return false;
  try {
    client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    // default DB from connection string
    db = client.db();
    connected = true;
    console.log('MongoDB connected');
    return true;
  } catch (e) {
    console.warn('MongoDB connection failed', e.message);
    connected = false;
    return false;
  }
}

async function findAll(collectionName, query = {}, options = {}) {
  if (!connected) throw new Error('Not connected to Mongo');
  return db.collection(collectionName).find(query, options).toArray();
}

async function findOne(collectionName, filter = {}) {
  if (!connected) throw new Error('Not connected to Mongo');
  return db.collection(collectionName).findOne(filter);
}

async function insertOne(collectionName, doc) {
  if (!connected) throw new Error('Not connected to Mongo');
  const r = await db.collection(collectionName).insertOne(doc);
  return { ...doc, _id: r.insertedId };
}

async function updateOne(collectionName, filter, update) {
  if (!connected) throw new Error('Not connected to Mongo');
  await db.collection(collectionName).updateOne(filter, { $set: update });
  return db.collection(collectionName).findOne(filter);
}

async function deleteOne(collectionName, filter) {
  if (!connected) throw new Error('Not connected to Mongo');
  await db.collection(collectionName).deleteOne(filter);
  return { deleted: true };
}

module.exports = { connect, findAll, findOne, insertOne, updateOne, deleteOne, get connected() { return connected; } };
