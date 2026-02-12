const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const mongo = require('../utils/mongo');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ensureDb } = require('../middleware/db');

router.use(ensureDb);

/* ---------------- GET ALL BOOKINGS ---------------- */
router.get('/', requireAuth, async (req, res) => {
  try {
    const filter = req.user?.role === 'admin' ? {} : { userId: req.user?.id };
    const docs = await mongo.findAll('bookings', filter);
    return res.json(docs);
  } catch (e) { return res.status(500).json({ message: e.message }); }
});

/* ---------------- GET BOOKING BY ID ---------------- */
router.get('/:id', requireAuth, async (req, res) => {
  try { const b = await mongo.findOne('bookings', { id: req.params.id }); if (!b) return res.status(404).json({ message: 'Not found' }); return res.json(b); } catch (e) { return res.status(500).json({ message: e.message }); }
});

/* ---------------- CREATE BOOKING ---------------- */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, capacityKW, status, userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }
  try {
    const user = await mongo.findOne('users', { id: userId, role: { $ne: 'admin' } });
    if (!user) return res.status(400).json({ message: 'Invalid user for booking' });
    const userSnapshot = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    };
    const booking = {
      id: uuidv4(),
      name,
      capacityKW,
      status: status || 'Registered',
      createdAt: new Date().toISOString(),
      userId: user.id,
      user: userSnapshot,
    };
    await mongo.insertOne('bookings', booking);
    return res.json(booking);
  } catch (e) { return res.status(500).json({ message: e.message }); }
});

/* ---------------- UPDATE BOOKING ---------------- */
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.userId) {
      const user = await mongo.findOne('users', { id: payload.userId, role: { $ne: 'admin' } });
      if (!user) return res.status(400).json({ message: 'Invalid user for booking' });
      payload.userId = user.id;
      payload.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      };
    }
    const upd = await mongo.updateOne('bookings', { id: req.params.id }, payload);
    return res.json(upd);
  } catch (e) { return res.status(500).json({ message: e.message }); }
});

/* ---------------- DELETE BOOKING ---------------- */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try { await mongo.deleteOne('bookings', { id: req.params.id }); return res.json({}); } catch (e) { return res.status(500).json({ message: e.message }); }
});

/* ---------------- UPDATE BOOKING STATUS ---------------- */
router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.body;
  try { const b = await mongo.updateOne('bookings', { id: req.params.id }, { status }); return res.json(b); } catch (e) { return res.status(500).json({ message: e.message }); }
});

module.exports = router;
