const express = require('express');
const router = express.Router();
const mongo = require('../utils/mongo');
const fs = require('fs');
const path = require('path');
const { ensureDb } = require('../middleware/db');

router.use(ensureDb);

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

// POST /api/reports/export-filter
// Body: { type: string, filters?: { from?, to?, status?, userId?, role?, search?, inStock? } }
router.post('/export-filter', async (req, res) => {
  try {
    const { type, filters = {} } = req.body;
    const from = parseDateParam(filters.from);
    const to = parseDateParam(filters.to);

    let headers = [];
    let rows = [];

    if (type === 'bookings') {
      const all = await mongo.findAll('bookings');
      const filtered = all.filter(b => {
        if (from || to) {
          const created = b.createdAt ? new Date(b.createdAt) : null;
          if (!created) return false;
          if (from && created < from) return false;
          if (to) { const t = new Date(to); t.setHours(23,59,59,999); if (created > t) return false; }
        }
        if (filters.status && filters.status !== 'All' && b.status !== filters.status) return false;
        if (filters.userId && filters.userId !== 'all' && b.userId !== filters.userId) return false;
        return true;
      });
      headers = ['id','name','capacityKW','status','userId','userName','createdAt'];
      rows = filtered.map(b => ({ id: b.id, name: b.name || '', capacityKW: b.capacityKW || 0, status: b.status || '', userId: b.userId || '', userName: b.user && b.user.name || '', createdAt: b.createdAt || '' }));
    } else if (type === 'requests') {
      const all = await mongo.findAll('requests');
      const filtered = all.filter(r => {
        if (from || to) {
          const created = r.createdAt ? new Date(r.createdAt) : null;
          if (!created) return false;
          if (from && created < from) return false;
          if (to) { const t = new Date(to); t.setHours(23,59,59,999); if (created > t) return false; }
        }
        if (filters.status && filters.status !== 'All' && r.status !== filters.status) return false;
        if (filters.userId && filters.userId !== 'all' && r.userId !== filters.userId) return false;
        return true;
      });
      headers = ['id','type','status','userId','userName','createdAt'];
      rows = filtered.map(r => ({ id: r.id, type: r.type || '', status: r.status || '', userId: r.userId || '', userName: r.user && r.user.name || '', createdAt: r.createdAt || '' }));
    } else if (type === 'customers' || type === 'users') {
      const all = await mongo.findAll('users');
      const filtered = all.filter(u => {
        if (from || to) {
          const created = u.createdAt ? new Date(u.createdAt) : null;
          if (!created) return false;
          if (from && created < from) return false;
          if (to) { const t = new Date(to); t.setHours(23,59,59,999); if (created > t) return false; }
        }
        if (filters.role && filters.role !== 'all' && (u.role || '').toLowerCase() !== String(filters.role).toLowerCase()) return false;
        if (filters.search) {
          const q = String(filters.search).toLowerCase();
          const name = (u.name || '').toLowerCase();
          const email = (u.email || '').toLowerCase();
          if (!name.includes(q) && !email.includes(q)) return false;
        }
        return true;
      });
      headers = ['id','name','email','phone','role','createdAt'];
      rows = filtered.map(u => ({ id: u.id, name: u.name || '', email: u.email || '', phone: u.phone || '', role: u.role || '', createdAt: u.createdAt || '' }));
    } else if (type === 'stock' || type === 'products') {
      const all = await mongo.findAll('products');
      const filtered = all.filter(p => {
        if (from || to) {
          const created = p.createdAt ? new Date(p.createdAt) : null;
          if (!created) return false;
          if (from && created < from) return false;
          if (to) { const t = new Date(to); t.setHours(23,59,59,999); if (created > t) return false; }
        }
        if (filters.inStock === 'in' && Number(p.stock || 0) <= 0) return false;
        if (filters.inStock === 'out' && Number(p.stock || 0) > 0) return false;
        if (filters.search) {
          const q = String(filters.search).toLowerCase();
          const name = (p.name || '').toLowerCase();
          const sku = (p.sku || '').toLowerCase();
          if (!name.includes(q) && !sku.includes(q)) return false;
        }
        return true;
      });
      headers = ['id','name','sku','stock','price','createdAt'];
      rows = filtered.map(p => ({ id: p.id, name: p.name || '', sku: p.sku || '', stock: p.stock ?? 0, price: p.price ?? '', createdAt: p.createdAt || '' }));
    } else {
      return res.status(400).json({ message: 'Invalid type for export' });
    }

    const csv = toCsv(rows, headers);
    try {
      const outDir = path.join(__dirname, '..', 'tmp', 'reports');
      fs.mkdirSync(outDir, { recursive: true });
      const filename = `${type}-report-${Date.now()}.csv`;
      const filepath = path.join(outDir, filename);
      fs.writeFileSync(filepath, csv, 'utf8');
      const fileUrl = `${req.protocol}://${req.get('host')}/files/${filename}`;
      return res.json({ fileUrl });
    } catch (err) {
      console.error('Failed writing filtered export file:', err && err.message ? err.message : err);
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/reports/download?type=bookings|requests|customers&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/download', async (req, res) => {
  try {
    const type = req.query.type;
    const from = parseDateParam(req.query.from);
    const to = parseDateParam(req.query.to);

    let headers = [];
    let rows = [];
    if (type === 'bookings') {
      const all = await mongo.findAll('bookings');
      const filtered = all.filter(b => {
        if (from || to) {
          const created = b.createdAt ? new Date(b.createdAt) : null;
          if (!created) return false;
          if (from && created < from) return false;
          if (to) { const t = new Date(to); t.setHours(23,59,59,999); if (created > t) return false; }
        }
        return true;
      });
      headers = ['id','name','capacityKW','status','userId','userName','createdAt'];
      rows = filtered.map(b => ({ id: b.id, name: b.name || '', capacityKW: b.capacityKW || 0, status: b.status || '', userId: b.userId || '', userName: b.user && b.user.name || '', createdAt: b.createdAt || '' }));
    } else if (type === 'requests') {
      const all = await mongo.findAll('requests');
      const filtered = all.filter(r => {
        if (from || to) {
          const created = r.createdAt ? new Date(r.createdAt) : null;
          if (!created) return false;
          if (from && created < from) return false;
          if (to) { const t = new Date(to); t.setHours(23,59,59,999); if (created > t) return false; }
        }
        return true;
      });
      headers = ['id','type','status','userId','userName','createdAt'];
      rows = filtered.map(r => ({ id: r.id, type: r.type || '', status: r.status || '', userId: r.userId || '', userName: r.user && r.user.name || '', createdAt: r.createdAt || '' }));
    } else if (type === 'customers') {
      const all = await mongo.findAll('users');
      const filtered = all.filter(u => {
        if (from || to) {
          const created = u.createdAt ? new Date(u.createdAt) : null;
          if (!created) return false;
          if (from && created < from) return false;
          if (to) { const t = new Date(to); t.setHours(23,59,59,999); if (created > t) return false; }
        }
        return true;
      });
      headers = ['id','name','email','phone','role','createdAt'];
      rows = filtered.map(u => ({ id: u.id, name: u.name || '', email: u.email || '', phone: u.phone || '', role: u.role || '', createdAt: u.createdAt || '' }));
    } else {
      return res.status(400).json({ message: 'Invalid type' });
    }

    const csv = toCsv(rows, headers);
    try {
      const outDir = path.join(__dirname, '..', 'tmp', 'reports');
      fs.mkdirSync(outDir, { recursive: true });
      const filename = `${type}-report-${Date.now()}.csv`;
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

// POST /api/reports/export
// Body: { filename?: string, headers: string[], rows: Array<object> }
router.post('/export', async (req, res) => {
  try {
    const { filename, headers, rows } = req.body;
    if (!rows || !Array.isArray(rows)) return res.status(400).json({ message: 'Rows array required' });
    let hdrs = headers;
    if (!hdrs || !Array.isArray(hdrs) || hdrs.length === 0) {
      // infer headers from first row
      const first = rows[0] || {};
      hdrs = Object.keys(first);
    }
    const csv = toCsv(rows, hdrs);
    try {
      const outDir = path.join(__dirname, '..', 'tmp', 'reports');
      fs.mkdirSync(outDir, { recursive: true });
      const name = filename && typeof filename === 'string' ? filename.replace(/[^a-z0-9\-_.]/gi, '_') : `export-${Date.now()}.csv`;
      const filepath = path.join(outDir, name);
      fs.writeFileSync(filepath, csv, 'utf8');
      console.log('Export written:', filepath);
      const fileUrl = `${req.protocol}://${req.get('host')}/files/${name}`;
      return res.json({ fileUrl });
    } catch (err) {
      console.error('Failed writing export file:', err && err.message ? err.message : err);
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
