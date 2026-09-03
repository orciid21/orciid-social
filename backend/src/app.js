const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const bootStatus = require('./config/bootStatus');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const socialRoutes = require('./routes/social.routes');
const postRoutes = require('./routes/post.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const oauthRoutes = require('./routes/oauth.routes');
const adminRoutes = require('./routes/admin.routes');
const uploadRoutes = require('./routes/upload.routes');
const projectRoutes = require('./routes/project.routes');

const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// Trust proxy (for Hostinger/nginx)
app.set('trust proxy', 1);

// Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'https://orciid.online', 'https://www.orciid.online'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Body parsing - webhook needs raw body
app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));
// Limits are generous because images can be uploaded as base64 inside a JSON
// body (see upload.routes.js) — base64 inflates payloads by ~33%.
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve React frontend static files
app.use(express.static(path.join(__dirname, '../public')));

// Health check. `boot` reports whether the background schema-maintenance steps
// finished, as counts only — enough to confirm a migration landed in production
// without exposing any schema detail, and without needing shell or file-manager
// access to the host.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), boot: bootStatus });
});

// Database reachability probe.
//
// Every DB route currently hangs rather than failing, so the real error never
// reaches anyone: config/prisma.js retries a failed operation four times, and
// with connection_limit=3/pool_timeout=20 that is upwards of 80 seconds — past
// the 60s ceiling at which the platform's nginx gives up and returns a 307. The
// diagnosis was being swallowed by the recovery logic wrapped around it.
//
// So this races ONE query against a short timer and reports what actually came
// back. The message is truncated and stripped of anything resembling a
// connection string, because Prisma's connection errors quote the datasource URL
// and this endpoint is public.
app.get('/health/db', async (req, res) => {
  const started = Date.now();
  const prisma = require('./config/prisma');
  const timeout = new Promise((resolve) =>
    setTimeout(() => resolve({ timedOut: true }), 5000));
  try {
    const result = await Promise.race([
      prisma.$queryRawUnsafe('SELECT 1').then(() => ({ ok: true })),
      timeout,
    ]);
    if (result.timedOut) {
      return res.status(503).json({
        db: 'timeout',
        waitedMs: Date.now() - started,
        hint: 'query did not return within 5s — connection pool or server unreachable',
      });
    }
    return res.json({ db: 'ok', tookMs: Date.now() - started });
  } catch (err) {
    const raw = String((err && err.message) || err);
    const safe = raw
      .replace(/mysql:\/\/[^\s"']*/gi, '[datasource]')
      // Prisma's P1001 quotes the host and port it failed to reach. The error
      // CLASS is what we need here, not the address of the database server.
      .replace(/[A-Za-z0-9._-]+:\d{2,5}/g, '[host]')
      .replace(/\s+/g, ' ')
      .slice(0, 300);
    return res.status(503).json({
      db: 'error',
      code: (err && err.code) || null,
      message: safe,
      tookMs: Date.now() - started,
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/auth', oauthRoutes); // OAuth callbacks
app.use('/api/admin', adminRoutes);

// SPA fallback — serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler
app.use(errorHandler);

module.exports = app;
