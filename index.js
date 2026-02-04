require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongo = require('./utils/mongo');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const bookingsRoutes = require('./routes/bookings');
const requestsRoutes = require('./routes/requests');
const productsRoutes = require('./routes/products');
const feedbackRoutes = require('./routes/feedback');
const uploadRoutes = require('./routes/upload');
const reportsRoutes = require('./routes/reports');

const path = require('path');
const app = express();
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.options("*", cors());
app.use(express.json());

// Ensure fetch is available in Node environments that don't expose global.fetch
// (Hostinger VPS may run older Node; dynamic import of node-fetch used if needed)
try {
  if (typeof fetch === 'undefined') {
    // create a lazy fetch that imports node-fetch when first used
    global.fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
    console.log('fetch polyfill configured (node-fetch)');
  }
} catch (e) {
  console.warn('Failed to setup fetch polyfill:', e && e.message);
}

// lightweight health endpoint to keep server warm and respond quickly
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api', uploadRoutes);
app.use('/api/reports', reportsRoutes);

// serve generated report files from backend/tmp/reports at /files
app.use('/files', express.static(path.join(__dirname, 'tmp', 'reports')));

const PORT = process.env.PORT || 5000;
// try connect to mongo if MONGO_URI is provided
(async () => {
  if (process.env.MONGO_URI) {
    await mongo.connect();
  }
})();
// Optional self-warmup: ping /api/health periodically to keep server warm if hosting allows.
if (process.env.SELF_WARMUP === 'true') {
  const intervalMs = Number(process.env.SELF_WARMUP_INTERVAL_MS) || 9 * 60 * 1000; // default 9 minutes
  setInterval(async () => {
    try {
      const url = `http://localhost:${PORT}/api/health`;
      // Node 20+ has fetch
      await fetch(url).then(r => console.log('Self-warm ping', r.status)).catch(e => console.warn('Self-warm failed', e && e.message));
    } catch (e) {
      console.warn('Self-warm error', e && e.message);
    }
  }, intervalMs);
  console.log('Self warmup enabled, intervalMs=', intervalMs);
}
app.listen(PORT, () => {
  console.log('Backend listening on port', PORT);
});
