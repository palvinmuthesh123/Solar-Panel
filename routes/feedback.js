const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const mongo = require('../utils/mongo');
const { requireAuth } = require('../middleware/auth');
const { ensureDb } = require('../middleware/db');

router.use(ensureDb);

router.get('/', requireAuth, async (req, res) => {
  try { const docs = await mongo.findAll('feedback'); return res.json(docs || []); } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.post('/', requireAuth, async (req, res) => {
  const { text, rating, userId } = req.body;
  const item = { id: uuidv4(), text, rating: rating || 0, userId, createdAt: new Date().toISOString() };
  try { await mongo.insertOne('feedback', item); return res.json(item); } catch (e) { return res.status(500).json({ message: e.message }); }
});

module.exports = router;
