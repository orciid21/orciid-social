const { PrismaClient } = require('@prisma/client');

// Cap the query engine's thread count BEFORE the engine ever starts.
//
// The engine is Rust on a tokio runtime, and tokio's documented default is "the
// number of cores available to the system". On shared hosting that is the whole
// physical machine's core count, not our slice of it — the same trap as the
// connection pool below, which also sized itself off cores it does not have.
//
// That matters here because Hostinger caps this account at 120 processes and
// CloudLinux counts THREADS against that cap, not just processes. "PANIC: timer
// has gone away" is this engine failing to spawn a thread once the cap is hit, so
// an engine that opens one worker per host core is spending the exact budget whose
// exhaustion kills it. Two workers is plenty for this workload and leaves the
// budget for the app itself.
//
// Set here rather than in the host's env panel so it cannot be lost by an env
// edit, and so it is read from the same file that documents why it exists.
if (!process.env.TOKIO_WORKER_THREADS) {
  process.env.TOKIO_WORKER_THREADS = '2';
}

// Cap the connection pool. Prisma's default is (CPU cores x 2) + 1, and on a
// shared host it sees the WHOLE machine's cores — so it opens dozens of
// connections for an app that needs a handful. That is a large, permanent draw
// on an account limited to 120 processes. Three is plenty here and leaves room
// for the app to actually run.
//
// Applied to the URL in code rather than to the DATABASE_URL env var, so the
// credentials stay where they are and this can't be lost by an env edit.
const poolUrl = (() => {
  const url = process.env.DATABASE_URL || '';
  if (!url || url.includes('connection_limit')) return url;
  return url + (url.includes('?') ? '&' : '?') + 'connection_limit=3&pool_timeout=20';
})();

const base = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  ...(poolUrl ? { datasources: { db: { url: poolUrl } } } : {}),
});

// On Hostinger's shared host the Prisma query engine intermittently panics with
// "timer has gone away" (a futures-timer bug triggered by CPU throttling). It
// surfaces to users as 500s on otherwise-fine requests (e.g. login). Recover
// transparently: when an operation hits that panic, recycle the engine
// ($disconnect → the next query spawns a fresh one) and retry a few times, so
// the request usually succeeds and the user never sees the error. (The real cure
// is moving off the contended shared host; this just hides the symptom.)
const isEnginePanic = (err) => {
  const m = String((err && err.message) || err || '');
  return /timer has gone away|Query engine exited|Response from the Engine was empty|PANIC/i.test(m);
};

const prisma = base.$extends({
  query: {
    async $allOperations({ args, query }) {
      let lastErr;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          return await query(args);
        } catch (err) {
          lastErr = err;
          if (!isEnginePanic(err)) throw err;
          try { await base.$disconnect(); } catch (_) { /* ignore */ }
          await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        }
      }
      throw lastErr;
    },
  },
});

module.exports = prisma;
