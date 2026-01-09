const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const mongo = require('../utils/mongo');

const SECRET = process.env.JWT_SECRET || 'dev-secret';

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (mongo.connected) {
    try {
      const existing = await mongo.findAll('users', { email });
      if (existing.length) return res.status(400).json({ message: 'Email exists' });
      const user = { id: uuidv4(), name, email, password, role: role || 'user', createdAt: new Date().toISOString() };
      await mongo.insertOne('users', user);
      const token = jwt.sign({ id: user.id, role: user.role }, SECRET);
      return res.json({ user: { ...user, password: undefined }, token });
    } catch (e) { return res.status(500).json({ message: e.message }); }
  }

  // fallback to file db
  const data = db.read();
  if (data.users.find(u => u.email === email)) return res.status(400).json({ message: 'Email exists' });
  const user = { id: uuidv4(), name, email, password, role: role || 'user', createdAt: new Date().toISOString() };
  data.users.unshift(user);
  db.write(data);
  const token = jwt.sign({ id: user.id, role: user.role }, SECRET);
  res.json({ user: { ...user, password: undefined }, token });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (mongo.connected) {
    try {
      const arr = await mongo.findAll('users', { email, password });
      const user = arr[0];
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id, role: user.role }, SECRET);
      return res.json({ user: { ...user, password: undefined }, token });
    } catch (e) { return res.status(500).json({ message: e.message }); }
  }

  const data = db.read();
  const user = data.users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, role: user.role }, SECRET);
  res.json({ user: { ...user, password: undefined }, token });
});

module.exports = router;
