require('dotenv').config();
const { execSync } = require('child_process');
const app = require('./app');
const { initScheduler } = require('./services/scheduler.service');

const PORT = process.env.PORT || 5000;

// Run Prisma DB push on startup to ensure tables exist
try {
  console.log('Running prisma db push...');
  execSync('npx prisma db push --accept-data-loss', {
    cwd: __dirname + '/..',
    stdio: 'inherit',
    timeout: 60000,
  });
  console.log('Prisma db push completed.');
} catch (err) {
  console.error('Prisma db push failed:', err.message);
  // Continue anyway — tables may already exist
}

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
