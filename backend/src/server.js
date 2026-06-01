// Load env vars — Hostinger stores them in .builds/config/.env (not in nodejs/)
const path = require('path');
const fs = require('fs');

const hostingerEnvPath = '/home/u957441087/domains/orciid.online/public_html/.builds/config/.env';
const localEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(hostingerEnvPath)) {
  require('dotenv').config({ path: hostingerEnvPath });
} else {
  require('dotenv').config({ path: localEnvPath });
}
const { exec } = require('child_process');
const app = require('./app');
const { initScheduler } = require('./services/scheduler.service');

const PORT = process.env.PORT || 5000;

// Start server immediately so Hostinger health check passes
const server = app.listen(PORT, () => {
  console.log(`🚀 Orciid Social API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);

  // Run prisma db push async AFTER server is already listening
  console.log('Running prisma db push in background...');
  exec(
    'npx prisma db push --accept-data-loss',
    { cwd: __dirname + '/..', timeout: 120000 },
    (err, stdout, stderr) => {
      if (err) {
        console.error('Prisma db push failed:', err.message);
        if (stderr) console.error(stderr);
      } else {
        console.log('Prisma db push completed successfully.');
        if (stdout) console.log(stdout);
      }
      // Initialize post scheduler after DB is ready
      initScheduler();
    }
  );
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
