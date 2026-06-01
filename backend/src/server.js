// Write to a debug file immediately — before anything else
const fs = require('fs');
const path = require('path');

const debugLog = '/home/u957441087/domains/orciid.online/nodejs/debug.log';
const write = (msg) => {
  try {
    fs.appendFileSync(debugLog, new Date().toISOString() + ' ' + msg + '\n');
  } catch(e) {}
};

write('=== SERVER STARTING ===');
write('Node version: ' + process.version);
write('__dirname: ' + __dirname);
write('CWD: ' + process.cwd());

// Load env vars — Hostinger stores them in .builds/config/.env (not in nodejs/)
const hostingerEnvPath = '/home/u957441087/domains/orciid.online/public_html/.builds/config/.env';
const localEnvPath = path.resolve(__dirname, '../.env');

write('Checking hostinger env path: ' + hostingerEnvPath);
write('Hostinger env exists: ' + fs.existsSync(hostingerEnvPath));

if (fs.existsSync(hostingerEnvPath)) {
  require('dotenv').config({ path: hostingerEnvPath });
  write('Loaded hostinger .env');
} else {
  require('dotenv').config({ path: localEnvPath });
  write('Loaded local .env');
}

write('DATABASE_URL set: ' + !!process.env.DATABASE_URL);
write('DATABASE_URL value: ' + (process.env.DATABASE_URL || 'NOT SET'));
write('NODE_ENV: ' + process.env.NODE_ENV);
write('PORT: ' + process.env.PORT);

let app, initScheduler;
try {
  write('Loading app...');
  app = require('./app');
  write('App loaded OK');
} catch(err) {
  write('ERROR loading app: ' + err.message);
  write(err.stack);
  process.exit(1);
}

try {
  write('Loading scheduler...');
  initScheduler = require('./services/scheduler.service').initScheduler;
  write('Scheduler loaded OK');
} catch(err) {
  write('ERROR loading scheduler: ' + err.message);
  write(err.stack);
  process.exit(1);
}

const { exec } = require('child_process');
const PORT = process.env.PORT || 5000;

write('Starting server on port: ' + PORT);

const server = app.listen(PORT, () => {
  write('Server listening on port ' + PORT);
  console.log(`🚀 Orciid Social API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);

  console.log('Running prisma db push in background...');
  exec(
    'node node_modules/.bin/prisma db push --accept-data-loss',
    { cwd: __dirname + '/..', timeout: 120000 },
    (err, stdout, stderr) => {
      if (err) {
        write('Prisma db push failed: ' + err.message);
        console.error('Prisma db push failed:', err.message);
        if (stderr) console.error(stderr);
      } else {
        write('Prisma db push completed');
        console.log('Prisma db push completed successfully.');
        if (stdout) console.log(stdout);
      }
      initScheduler();
    }
  );
});

server.on('error', (err) => {
  write('Server error: ' + err.message);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  write('Unhandled rejection: ' + err.message);
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  write('Uncaught exception: ' + err.message);
  write(err.stack);
  process.exit(1);
});
