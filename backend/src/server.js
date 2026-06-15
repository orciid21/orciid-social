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

// Keep the SocialAccount.platform MySQL ENUM in sync with the Prisma Platform
// enum. Prisma maps the enum to a native MySQL ENUM column, and (since boot-time
// `prisma db push` was removed) adding a new enum value in schema.prisma does NOT
// reach the DB — inserting it then fails with "Data truncated for column platform".
// This reads the current column type and adds any missing value via a single
// idempotent ALTER, preserving the existing values + nullability.
const REQUIRED_PLATFORMS = ['FACEBOOK', 'INSTAGRAM', 'TWITTER', 'LINKEDIN', 'TIKTOK', 'THREADS', 'YOUTUBE', 'PINTEREST'];
const ensurePlatformEnum = async () => {
  try {
    const rows = await prismaClient.$queryRawUnsafe(
      "SELECT COLUMN_TYPE AS t, IS_NULLABLE AS n FROM INFORMATION_SCHEMA.COLUMNS " +
      "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SocialAccount' AND COLUMN_NAME = 'platform'"
    );
    const row = Array.isArray(rows) && rows[0];
    if (!row) return;
    const colType = String(row.t || '');
    const missing = REQUIRED_PLATFORMS.filter((p) => !colType.includes(`'${p}'`));
    if (missing.length === 0) {
      write('Platform enum already up to date');
      return;
    }
    const nullable = String(row.n).toUpperCase() === 'YES' ? 'NULL' : 'NOT NULL';
    const newType = "enum(" + REQUIRED_PLATFORMS.map((p) => `'${p}'`).join(',') + ")";
    await prismaClient.$executeRawUnsafe(
      "ALTER TABLE `SocialAccount` MODIFY `platform` " + newType + " " + nullable
    );
    write('Platform enum: added ' + missing.join(','));
  } catch (err) {
    write('ensurePlatformEnum error: ' + (err.message || err));
  }
};

const startServer = () => {
  write('Starting server on port: ' + PORT);
  server = app.listen(PORT, () => {
    write('Server listening on port ' + PORT);
    console.log(`🚀 Orciid Social API running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV}`);

    // Start the scheduler directly. (Removed the boot-time `prisma db push`: it
    // spawned a SECOND Prisma engine on every restart, and under host resource
    // pressure that boot-time contention coincided with the main engine's first
    // query — a likely trigger for the "timer has gone away" engine panic that
    // wedged the DB. ensureColumns() already applies the needed schema changes
    // via the always-installed @prisma/client, so db push is redundant.)
    initScheduler();
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

// Some deploy restarts leave the Prisma query engine in a dead state where
// EVERY query throws "PANIC: timer has gone away" (surfaced to users as 500s
// and bogus "Invalid token" 401s). Prisma calls it non-recoverable for that
// engine instance — but $disconnect() discards the engine and the next query
// spawns a fresh one, which comes up healthy. So: probe with SELECT 1 and
// recycle the engine until it answers, instead of serving a broken site.
const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label + ' timed out after ' + ms + 'ms')), ms)),
  ]);

// NEVER exit the process here. We tried process.exit() on panic to force a
// fresh process — it caused a crash loop: every fresh boot re-panicked, the
// platform supervisor hit backoff, and the whole site went hard-down (000) for
// minutes. Instead keep the process ALIVE and listening; recycle the Prisma
// engine with $disconnect (the next query spawns a new engine) and retry
// forever. Static pages + non-DB routes keep serving, and DB calls recover
// in-place the moment MySQL is reachable again — no downtime, no crash loop.
const verifyDatabaseInBackground = async () => {
  for (let attempt = 1; ; attempt++) {
    try {
      // Hard timeout: after a panic the next query can HANG instead of throw.
      await withTimeout(prismaClient.$queryRawUnsafe('SELECT 1'), 8000, 'db probe');
      write('Database check OK (attempt ' + attempt + ')');
      return true;
    } catch (err) {
      const msg = String(err.message || err);
      write('Database check failed (attempt ' + attempt + '): ' + msg.slice(0, 160));
      // Recycle the engine: $disconnect discards it, the next query spawns a new one.
      try { await withTimeout(prismaClient.$disconnect(), 3000, 'disconnect'); } catch (e) {}
      await new Promise((r) => setTimeout(r, attempt >= 5 ? 15000 : 2000));
    }
  }
};

// LISTEN FIRST — the platform proxy 503s the whole site if the port doesn't
// open within seconds, so nothing slow (DB probes, migrations) may run before
// startServer(). They all run in the background right after.
write('Starting server immediately; DB verification runs in background...');
startServer();
verifyDatabaseInBackground().then(ensureColumns).then(ensurePlatformEnum).then(fixupFacebookAvatars);

// Perpetual DB health monitor. verifyDatabaseInBackground() above only runs ONCE
// (it resolves on the first healthy SELECT 1). The boot chain then runs raw-query
// migration steps (ensureColumns / ensurePlatformEnum / fixupFacebookAvatars) — if
// any of those, or a runtime query, panics the engine ("timer has gone away"),
// nothing was recycling it and the whole site stayed 500 forever (only a manual
// restart fixed it). This probes SELECT 1 every 20s and, on failure, recycles the
// engine via $disconnect (the next query spawns a fresh one), so ANY panic — boot
// or runtime — recovers in-place within ~20s instead of wedging the site.
setInterval(async () => {
  try {
    await withTimeout(prismaClient.$queryRawUnsafe('SELECT 1'), 8000, 'db monitor');
  } catch (err) {
    write('DB monitor: probe failed, recycling engine — ' + String(err.message || err).slice(0, 120));
    try { await withTimeout(prismaClient.$disconnect(), 3000, 'disconnect'); } catch (e) {}
  }
}, 20000);

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
