const mongo = require('../utils/mongo');

async function ensureDb(req, res, next) {
  try {
    await mongo.ensureConnected();
    return next();
  } catch (e) {
    console.error('DB connect failed (middleware):', e);
    return res.status(503).json({ message: 'Database unavailable' });
  }
}

module.exports = { ensureDb };
