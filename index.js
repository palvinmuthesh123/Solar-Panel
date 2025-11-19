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

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api', uploadRoutes);

const PORT = process.env.PORT || 5000;
// try connect to mongo if MONGO_URI is provided
(async () => {
  if (process.env.MONGO_URI) {
    await mongo.connect();
  }
})();
app.listen(PORT, () => {
  console.log('Backend listening on port', PORT);
});
