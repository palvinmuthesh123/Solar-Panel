const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const mongo = require('../utils/mongo');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { uploadMiddleware } = require('../controllers/uploadController');
const cloudinary = require('cloudinary').v2;

// ensure Cloudinary is configured (uploadController also configures it, this is defensive)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
  try {
    // parse multipart/form-data if present
    await uploadMiddleware(req, res);

    const { name, sku, price, stock } = req.body;

    let imageUrl = req.body.imageUrl;

    // if a file was uploaded, upload to Cloudinary
    if (req.file && req.file.buffer) {
      const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const result = await cloudinary.uploader.upload(dataUrl, { folder: 'solar-panel-app', resource_type: 'auto' });
      imageUrl = result.secure_url;
    }

    const item = { id: uuidv4(), name, sku, price: Number(price) || 0, stock: Number(stock) || 0, imageUrl, createdAt: new Date().toISOString() };
    if (!mongo.connected) return res.status(500).json({ message: 'MongoDB not connected' });
    await mongo.insertOne('products', item);
    return res.json(item);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await uploadMiddleware(req, res);

    let updatePayload = { ...req.body };

    if (req.file && req.file.buffer) {
      const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const result = await cloudinary.uploader.upload(dataUrl, { folder: 'solar-panel-app', resource_type: 'auto' });
      updatePayload.imageUrl = result.secure_url;
    }

    // handle stock adjustment operations if requested
    if ((updatePayload.stockAction || updatePayload.stockAdjustment) && mongo.connected) {
      const existing = await mongo.findOne('products', { id: req.params.id });
      if (existing) {
        const action = updatePayload.stockAction;
        const adj = Number(updatePayload.stockAdjustment || 0) || 0;
        const prev = Number(existing.stock || 0);
        let newStock = prev;
        if (action === 'in') newStock = prev + adj;
        else if (action === 'out') newStock = Math.max(0, prev - adj);

        updatePayload.stock = newStock;

        // record history
        try {
          await mongo.insertOne('stockHistory', { id: uuidv4(), productId: req.params.id, change: adj, type: action, prevStock: prev, newStock, by: req.user && req.user.id, createdAt: new Date().toISOString() });
        } catch (err) {
          // ignore history failures
        }
      }
      // remove helper fields so they are not persisted directly
      delete updatePayload.stockAction;
      delete updatePayload.stockAdjustment;
    }

    if (!mongo.connected) return res.status(500).json({ message: 'MongoDB not connected' });
    const upd = await mongo.updateOne('products', { id: req.params.id }, updatePayload);
    return res.json(upd);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!mongo.connected) {
    return res.status(500).json({ message: 'MongoDB not connected' });
  }
  try { await mongo.deleteOne('products', { id: req.params.id }); return res.json({}); } catch (e) { return res.status(500).json({ message: e.message }); }
});

module.exports = router;
