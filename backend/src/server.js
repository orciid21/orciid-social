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
const prismaClient = require('./config/prisma');
const PORT = process.env.PORT || 5000;

let server;

// --- Idempotent schema migration, run BEFORE the server accepts traffic ---
// Why this exists: the `prisma` CLI is a devDependency and is NOT installed in
// production, so `prisma db push` silently fails there. Any column newly added to
// schema.prisma then never reaches the database — yet the regenerated Prisma client
// still SELECTs it on every query, which makes EVERY request on that table 500
// (this took down login once). To avoid that, we add missing columns here using
// @prisma/client (a real, always-installed dependency) instead of the CLI.
//
// Each entry first checks INFORMATION_SCHEMA and only ALTERs when the column is
// absent, so it is safe to run on every boot. Table/column names are hardcoded
// constants (never user input), so inlining them into the DDL is safe.
const PENDING_COLUMNS = [
  {
    table: 'User',
    column: 'fbConnectToken',
    ddl: 'ALTER TABLE `User` ADD COLUMN `fbConnectToken` TEXT NULL',
  },
];

const ensureColumns = async () => {
  for (const { table, column, ddl } of PENDING_COLUMNS) {
    try {
      const rows = await prismaClient.$queryRawUnsafe(
        'SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        table,
        column
      );
      if (Array.isArray(rows) && rows.length > 0) {
        write(`Column ${table}.${column} already exists — skipping`);
        continue;
      }
      await prismaClient.$executeRawUnsafe(ddl);
      write(`Column ${table}.${column} added successfully`);
    } catch (err) {
      // Never let a migration hiccup stop the server from booting.
      write(`ensureColumns error for ${table}.${column}: ` + (err.message || err));
    }
  }
};

const startServer = () => {
  write('Starting server on port: ' + PORT);
  server = app.listen(PORT, () => {
    write('Server listening on port ' + PORT);
    console.log(`🚀 Orciid Social API running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV}`);

    // Best-effort: also try the prisma CLI db push, in case it ever IS available.
    // Harmless when it isn't — ensureColumns() already added what we need.
    console.log('Running prisma db push in background...');
    exec(
      process.execPath + ' node_modules/.bin/prisma db push --accept-data-loss',
      { cwd: __dirname + '/..', timeout: 120000 },
      (err, stdout, stderr) => {
        if (err) {
          write('Prisma db push failed: ' + err.message);
          if (stderr) write('Prisma stderr: ' + stderr);
          if (stdout) write('Prisma stdout: ' + stdout);
        } else {
          write('Prisma db push completed');
          if (stdout) console.log(stdout);
        }
        initScheduler();
      }
    );
  });

  server.on('error', (err) => {
    write('Server error: ' + err.message);
  });
};

// One-time data fix, safe to re-run on every boot: rewrite Facebook account
// avatars to the permanent Graph picture endpoint. The signed CDN URLs stored
// at connect time expire after a while, leaving broken channel pictures —
// graph.facebook.com/{id}/picture always redirects to the current picture.
const fixupFacebookAvatars = async () => {
  try {
    const n = await prismaClient.$executeRawUnsafe(
      "UPDATE `SocialAccount` SET `avatar` = CONCAT('https://graph.facebook.com/', `platformId`, '/picture?type=large') " +
      "WHERE `platform` = 'FACEBOOK' AND (`avatar` IS NULL OR `avatar` NOT LIKE '%/picture%')"
    );
    if (n > 0) write(`fixupFacebookAvatars: rewrote ${n} avatar URL(s)`);
  } catch (err) {
    write('fixupFacebookAvatars error: ' + (err.message || err));
  }
};

// Run the migration first, then start listening — whether it succeeds or not.
write('Running ensureColumns migration before listen...');
ensureColumns().then(fixupFacebookAvatars).finally(startServer);

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('unhandledRejection', (err) => {
  write('Unhandled rejection: ' + err.message);
  console.error('Unhandled Promise Rejection:', err);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  write('Uncaught exception: ' + err.message);
  write(err.stack);
  process.exit(1);
});
