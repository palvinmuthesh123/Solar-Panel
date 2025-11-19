const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const mongo = require('../utils/mongo');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try {
    // If requester is admin, return all; otherwise return only their requests
    const filter = req.user?.role === 'admin' ? {} : { userId: req.user?.id };
    const docs = await mongo.findAll('requests', filter);
    return res.json(docs);
  } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.get('/:id', requireAuth, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { const r = await mongo.findOne('requests', { id: req.params.id }); if (!r) return res.status(404).json({ message: 'Not found' }); return res.json(r); } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.post('/', requireAuth, async (req, res) => {
  const { type, comments, status } = req.body;
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try {
    const item = {
      id: uuidv4(),
      type,
      comments,
      status: status || 'Pending',
      createdAt: new Date().toISOString(),
      userId: req.user?.id,
      user: {
        id: req.user?.id,
        name: req.user?.name,
        email: req.user?.email || null,
        phone: req.user?.phone || null,
      },
    };
    await mongo.insertOne('requests', item);
    return res.json(item);
  } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.put('/:id', requireAuth, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try {
    const existing = await mongo.findOne('requests', { id: req.params.id });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    // only admin or owner can update
    if (req.user?.role !== 'admin' && existing.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const payload = { ...req.body };
    // do not allow non-admin to change userId
    if (payload.userId && req.user?.role !== 'admin') delete payload.userId;
    // if admin changes userId, update user snapshot
    if (payload.userId && req.user?.role === 'admin') {
      const user = await mongo.findOne('users', { id: payload.userId });
      if (user) payload.user = { id: user.id, name: user.name, email: user.email || null, phone: user.phone || null };
    }
    const upd = await mongo.updateOne('requests', { id: req.params.id }, payload);
    return res.json(upd);
  } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { await mongo.deleteOne('requests', { id: req.params.id }); return res.json({}); } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { const r = await mongo.updateOne('requests', { id: req.params.id }, { status }); return res.json(r); } catch (e) { return res.status(500).json({ message: e.message }); }
});

module.exports = router;
