const express = require('express');
const router = express.Router();
const mongo = require('../utils/mongo');
const fs = require('fs');
const path = require('path');

function toCsv(rows, headers) {
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.indexOf(',') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('"') >= 0) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const head = headers.join(',');
  const lines = rows.map(r => headers.map(h => escape(r[h])).join(','));
  return [head].concat(lines).join('\n');
}

function parseDateParam(v) {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d;
}

// GET /api/reports/stock?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/stock', async (req, res) => {
  if (!mongo.connected) return res.status(500).json({ message: 'MongoDB not connected' });
  try {
    const from = parseDateParam(req.query.from);
    const to = parseDateParam(req.query.to);
    const all = await mongo.findAll('products');
    const filtered = all.filter(p => {
      if (from || to) {
        const created = p.createdAt ? new Date(p.createdAt) : null;
        if (!created) return false;
        if (from && created < from) return false;
        if (to) {
          const t = new Date(to); t.setHours(23,59,59,999);
          if (created > t) return false;
        }
      }
      return true;
    });

    const rows = filtered.map(p => ({ id: p.id, name: p.name, sku: p.sku, stock: p.stock ?? 0, price: p.price ?? 0, createdAt: p.createdAt || '' }));
    const csv = toCsv(rows, ['id','name','sku','stock','price','createdAt']);
    try {
      const outDir = path.join(__dirname, '..', 'tmp', 'reports');
      fs.mkdirSync(outDir, { recursive: true });
      const filename = `stock-report-${Date.now()}.csv`;
      const filepath = path.join(outDir, filename);
      fs.writeFileSync(filepath, csv, 'utf8');
      console.log('Report written:', filepath);
      const fileUrl = `${req.protocol}://${req.get('host')}/files/${filename}`;
      return res.json({ fileUrl });
    } catch (err) {
      console.error('Failed writing report file:', err && err.message ? err.message : err);
      // fallback to returning CSV text
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/reports/customers?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/customers', async (req, res) => {
  if (!mongo.connected) return res.status(500).json({ message: 'MongoDB not connected' });
  try {
    const from = parseDateParam(req.query.from);
    const to = parseDateParam(req.query.to);
    const all = await mongo.findAll('users');
    const filtered = all.filter(u => {
      if (from || to) {
        const created = u.createdAt ? new Date(u.createdAt) : null;
        if (!created) return false;
        if (from && created < from) return false;
        if (to) {
          const t = new Date(to); t.setHours(23,59,59,999);
          if (created > t) return false;
        }
      }
      return true;
    });
    const rows = filtered.map(u => ({ id: u.id, name: u.name, email: u.email || '', phone: u.phone || '', role: u.role || '', createdAt: u.createdAt || '' }));
    const csv = toCsv(rows, ['id','name','email','phone','role','createdAt']);
    try {
      const outDir = path.join(__dirname, '..', 'tmp', 'reports');
      fs.mkdirSync(outDir, { recursive: true });
      const filename = `customers-report-${Date.now()}.csv`;
      const filepath = path.join(outDir, filename);
      fs.writeFileSync(filepath, csv, 'utf8');
      console.log('Report written:', filepath);
      const fileUrl = `${req.protocol}://${req.get('host')}/files/${filename}`;
      return res.json({ fileUrl });
    } catch (err) {
      console.error('Failed writing report file:', err && err.message ? err.message : err);
      // fallback to returning CSV text
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
