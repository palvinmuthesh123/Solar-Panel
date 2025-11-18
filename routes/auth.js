const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const mongo = require('../utils/mongo');

const SECRET = process.env.JWT_SECRET || 'dev-secret';

router.post('/register', async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try {
    const nextRole = role || 'user';
    if (nextRole === 'admin' && !email) {
      return res.status(400).json({ message: 'Admin registration requires email' });
    }
    if (nextRole !== 'admin' && !phone) {
      return res.status(400).json({ message: 'User registration requires phone number' });
    }

    const uniquenessFilters = [];
    if (email) uniquenessFilters.push({ email });
    if (phone) uniquenessFilters.push({ phone });
    if (uniquenessFilters.length) {
      const existing = await mongo.findAll('users', { $or: uniquenessFilters });
      if (existing.length) return res.status(400).json({ message: 'Email or phone already exists' });
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
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET);
    return res.json({ user: { ...user, password: undefined }, token });
  } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.post('/login', async (req, res) => {
  const { email, phone, password } = req.body;
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }
  if (!email && !phone) {
    return res.status(400).json({ message: 'Provide email (admin) or phone (user)' });
  }
  try {
    const query = { password };
    const usingEmailLogin = Boolean(email);
    if (usingEmailLogin) query.email = email;
    else query.phone = phone;

    const arr = await mongo.findAll('users', query);
    const user = arr[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    if (usingEmailLogin && user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can login with email' });
    }
    if (!usingEmailLogin && user.role === 'admin') {
      return res.status(403).json({ message: 'Admins must login with email' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET);
    return res.json({ user: { ...user, password: undefined }, token });
  } catch (e) { return res.status(500).json({ message: e.message }); }
});

module.exports = router;
