const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const mongo = require('../utils/mongo');

const SECRET = process.env.JWT_SECRET || 'dev-secret';

/* ---------------- REGISTER ---------------- */
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    // Ensure Mongo is ready (NO cold failure)
    await mongo.ensureConnected();

    const existing = await mongo.findOne('users', { email });
    if (existing) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const user = {
      id: uuidv4(),
      name,
      email,
      password, // ⚠️ plaintext (bcrypt recommended later)
      role: role || 'user',
      createdAt: new Date()
    };

    await mongo.insertOne('users', user);

    const token = jwt.sign(
      { id: user.id, role: user.role },
      SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      user: { ...user, password: undefined },
      token
    });

  } catch (e) {
    console.error('Register error:', e);
    return res.status(500).json({ message: 'Registration failed' });
  }
});

/* ---------------- LOGIN ---------------- */
router.post('/login', async (req, res) => {
  const { email, phone, password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Password required' });
  }

  if (!email && !phone) {
    return res.status(400).json({ message: 'Email or phone required' });
  }

  try {
    // 🔥 GUARANTEES Mongo is connected BEFORE query
    await mongo.ensureConnected();

    const query = email ? { email } : { phone };

    // ⚡ SINGLE indexed query
    const user = await mongo.findOne('users', query);

    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET,
      { expiresIn: '7d' }
    );
    return res.json({ user: { ...user, password: undefined }, token });

  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).json({ message: 'Login failed' });
  }
});

module.exports = router;
