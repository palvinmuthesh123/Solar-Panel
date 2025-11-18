const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const mongo = require('../utils/mongo');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { const docs = await mongo.findAll('products'); return res.json(docs); } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.get('/:id', requireAuth, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { const p = await mongo.findOne('products', { id: req.params.id }); if (!p) return res.status(404).json({ message: 'Not found' }); return res.json(p); } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, sku, price, stock } = req.body;
  const item = { id: uuidv4(), name, sku, price, stock, createdAt: new Date().toISOString() };
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { await mongo.insertOne('products', item); return res.json(item); } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { const upd = await mongo.updateOne('products', { id: req.params.id }, req.body); return res.json(upd); } catch (e) { return res.status(500).json({ message: e.message }); }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { await mongo.deleteOne('products', { id: req.params.id }); return res.json({}); } catch (e) { return res.status(500).json({ message: e.message }); }
});

module.exports = router;
