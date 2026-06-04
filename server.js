// ============================================================
// ScholarConnect - Main Server Entry Point
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./backend/config/database');

const app = express();

// ── Connect to MongoDB ──────────────────────────────────────
connectDB();

// ── Security Middleware ─────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Rate Limiting ───────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// ── Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ─────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Static Files ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'frontend')));

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth',           require('./backend/routes/auth'));
app.use('/api/scholarships',   require('./backend/routes/scholarships'));
app.use('/api/notifications',  require('./backend/routes/notifications'));
app.use('/api/contact',        require('./backend/routes/contact'));
app.use('/api/eligibility',    require('./backend/routes/eligibility'));
app.use('/api/recommendations',require('./backend/routes/recommendations'));
app.use('/api/users',          require('./backend/routes/users'));
app.use('/api/admin',          require('./backend/routes/admin'));

// ── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ScholarConnect API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// ── Serve Frontend for all non-API routes ────────────────────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'frontend/pages/index.html'));
  } else {
    res.status(404).json({ success: false, message: 'API route not found' });
  }
});

// ── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🎓 ScholarConnect Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
console.log("SERVER DB URI:", process.env.MONGODB_URI);
