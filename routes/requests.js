const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const mongo = require('../utils/mongo');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { const docs = await mongo.findAll('requests'); return res.json(docs); } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.get('/:id', requireAuth, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { const r = await mongo.findOne('requests', { id: req.params.id }); if (!r) return res.status(404).json({ message: 'Not found' }); return res.json(r); } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.post('/', requireAuth, async (req, res) => {
  const { type, comments, status } = req.body;
  const item = { id: uuidv4(), type, comments, status: status || 'Pending', createdAt: new Date().toISOString() };
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { await mongo.insertOne('requests', item); return res.json(item); } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.put('/:id', requireAuth, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { const upd = await mongo.updateOne('requests', { id: req.params.id }, req.body); return res.json(upd); } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { await mongo.deleteOne('requests', { id: req.params.id }); return res.json({}); } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { const r = await mongo.updateOne('requests', { id: req.params.id }, { status }); return res.json(r); } catch (e) { return res.status(500).json({ message: e.message }); }
});

module.exports = router;
