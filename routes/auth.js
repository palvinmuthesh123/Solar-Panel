const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const mongo = require('../utils/mongo');

const SECRET = process.env.JWT_SECRET || 'dev-secret';

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!mongo.connected) 
    return res.status(500).json({ message: 'MongoDB not connected' });
    try {
      const existing = await mongo.findAll('users', { email });
      if (existing.length) return res.status(400).json({ message: 'Email exists' });
      const user = { id: uuidv4(), name, email, password, role: role || 'user', createdAt: new Date().toISOString() };
      await mongo.insertOne('users', user);
      const token = jwt.sign({ id: user.id, role: user.role }, SECRET);
      return res.json({ user: { ...user, password: undefined }, token });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.post('/login', async (req, res) => {
  const { email, phone, password } = req.body;
  if (!password) return res.status(400).json({ message: 'Password required' });
  if (!mongo.connected) return res.status(500).json({ message: 'MongoDB not connected' });
    try {
      // build query: match password and either email or phone
      const q = { password };
      if (email) q.email = email;
      else if (phone) q.phone = phone;
      else return res.status(400).json({ message: 'Email or phone required' });
      const arr = await mongo.findAll('users', q);
      const user = arr[0];
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id, role: user.role }, SECRET);
      return res.json({ user: { ...user, password: undefined }, token });
    } catch (e) { return res.status(500).json({ message: e.message }); }
});

module.exports = router;
