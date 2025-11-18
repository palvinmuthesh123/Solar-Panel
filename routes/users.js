const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const mongo = require('../utils/mongo');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try {
    const users = await mongo.findAll('users');
    return res.json(users.map(u => ({ ...u, password: undefined })));
  } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.get('/:id', requireAuth, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try {
    const u = await mongo.findOne('users', { id: req.params.id });
    if (!u) return res.status(404).json({ message: 'Not found' });
    return res.json({ ...u, password: undefined });
  } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try {
    const exists = await mongo.findAll('users', { email });
    if (exists.length) return res.status(400).json({ message: 'Email exists' });
    const user = { id: uuidv4(), name, email, password, role: role || 'user', createdAt: new Date().toISOString() };
    await mongo.insertOne('users', user);
    return res.json({ ...user, password: undefined });
  } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try {
    const updated = await mongo.updateOne('users', { id: req.params.id }, req.body);
    return res.json({ ...updated, password: undefined });
  } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try {
    await mongo.deleteOne('users', { id: req.params.id });
    return res.json({});
  } catch (e) { return res.status(500).json({ message: e.message }); }
});

module.exports = router;
