require('dotenv').config();
const app = require('./app');
const { initScheduler } = require('./services/scheduler.service');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Orciid Social API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  // Initialize post scheduler on startup
  initScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});
