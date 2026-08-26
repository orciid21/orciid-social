const { PrismaClient } = require('@prisma/client');

const base = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
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
