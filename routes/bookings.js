const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const mongo = require('../utils/mongo');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { const docs = await mongo.findAll('bookings'); return res.json(docs); } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.get('/:id', requireAuth, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { const b = await mongo.findOne('bookings', { id: req.params.id }); if (!b) return res.status(404).json({ message: 'Not found' }); return res.json(b); } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.post('/', requireAuth, async (req, res) => {
  const { name, capacityKW, status } = req.body;
  const booking = { id: uuidv4(), name, capacityKW, status: status || 'Registered', createdAt: new Date().toISOString() };
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { await mongo.insertOne('bookings', booking); return res.json(booking); } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.put('/:id', requireAuth, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { const upd = await mongo.updateOne('bookings', { id: req.params.id }, req.body); return res.json(upd); } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { await mongo.deleteOne('bookings', { id: req.params.id }); return res.json({}); } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { const b = await mongo.updateOne('bookings', { id: req.params.id }, { status }); return res.json(b); } catch (e) { return res.status(500).json({ message: e.message }); }
});

module.exports = router;
