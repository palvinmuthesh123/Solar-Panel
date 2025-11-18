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
    const users = await mongo.findAll('users', { role: { $ne: 'admin' } });
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
  const { name, email, phone, password, role } = req.body;
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try {
    const nextRole = role || 'user';
    if (nextRole === 'admin' && !email) {
      return res.status(400).json({ message: 'Admin creation requires email' });
    }
    if (nextRole !== 'admin' && !phone) {
      return res.status(400).json({ message: 'Users require a phone number' });
    }
    const uniquenessFilters = [];
    if (email) uniquenessFilters.push({ email });
    if (phone) uniquenessFilters.push({ phone });
    if (uniquenessFilters.length) {
      const exists = await mongo.findAll('users', { $or: uniquenessFilters });
      if (exists.length) return res.status(400).json({ message: 'Email or phone already exists' });
    }
    const user = {
      id: uuidv4(),
      name,
      email: email || null,
      phone: phone || null,
      password,
      role: nextRole,
      createdAt: new Date().toISOString(),
    };
    await mongo.insertOne('users', user);
    return res.json({ ...user, password: undefined });
  } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try {
    const payload = { ...req.body };
    if (payload.email === '') payload.email = null;
    if (payload.phone === '') payload.phone = null;
    if (payload.role && payload.role === 'admin' && !payload.email) {
      return res.status(400).json({ message: 'Admin accounts require email' });
    }
    if (payload.role && payload.role !== 'admin' && !payload.phone) {
      return res.status(400).json({ message: 'User accounts require phone' });
    }
    if (payload.email || payload.phone) {
      const uniquenessFilters = [];
      if (payload.email) uniquenessFilters.push({ email: payload.email });
      if (payload.phone) uniquenessFilters.push({ phone: payload.phone });
      if (uniquenessFilters.length) {
        const existing = await mongo.findAll('users', {
          id: { $ne: req.params.id },
          $or: uniquenessFilters,
        });
        if (existing.length) return res.status(400).json({ message: 'Email or phone already exists' });
      }
    }
    const updated = await mongo.updateOne('users', { id: req.params.id }, payload);
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
