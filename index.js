require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongo = require('./utils/mongo');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const bookingsRoutes = require('./routes/bookings');
const requestsRoutes = require('./routes/requests');
const productsRoutes = require('./routes/products');
const feedbackRoutes = require('./routes/feedback');
const uploadRoutes = require('./routes/upload');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

/* -------------------- Middleware -------------------- */

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.options("*", cors());
app.use(express.json());

/* -------------------- Fetch polyfill (safe) -------------------- */
try {
  if (typeof fetch === 'undefined') {
    // create a lazy fetch that imports node-fetch when first used
    global.fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
    console.log('fetch polyfill configured (node-fetch)');
  }
} catch (e) {
  console.warn('fetch polyfill failed:', e?.message);
}

/* -------------------- Health API (NO Mongo) -------------------- */
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

/* -------------------- Routes -------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api', uploadRoutes);
app.use('/api/reports', reportsRoutes);

/* -------------------- Static Files -------------------- */
app.use('/files', express.static(path.join(__dirname, 'tmp', 'reports')));

/* -------------------- Start Server -------------------- */
app.listen(PORT, async () => {
  console.log(`🚀 Backend listening on port ${PORT}`);

  // 🔥 VERY IMPORTANT: warm MongoDB ON STARTUP
  try {
    await mongo.ensureConnected();
    console.log('🔥 MongoDB warmed and ready');
  } catch (e) {
    console.error('❌ MongoDB connection failed at startup:', e.message);
  }
});

/* -------------------- Graceful Shutdown (PM2 safe) -------------------- */
process.on('SIGINT', async () => {
  console.log('SIGINT received, closing MongoDB...');
  await mongo.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing MongoDB...');
  await mongo.close();
  process.exit(0);
});
