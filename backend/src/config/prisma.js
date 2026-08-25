const { PrismaClient } = require('@prisma/client');

// On Hostinger's shared host the Prisma query engine intermittently panics with
// "timer has gone away" (a futures-timer bug provoked by CPU throttling). Prisma
// itself calls this "a non-recoverable error", and that is literally true for
// the client it happened on: once the engine panics, every later query through
// that same client fails too, so the app serves 500s until someone restarts the
// process by hand.
//
// Reconnecting is not enough — the client stays poisoned. So on a panic we build
// a NEW PrismaClient and re-issue the operation against it. The export below is
// a proxy that always reads the current client, so callers pick up the
// replacement without holding a stale reference.
//
// (The real cure is moving off the contended shared host; this keeps the app
// serving in the meantime.)

const logLevels = process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'];

const isEnginePanic = (err) => {
  const m = String((err && err.message) || err || '');
  return /timer has gone away|Query engine exited|Response from the Engine was empty|PANIC/i.test(m);
};

let base;
let extended;

const build = () => {
  base = new PrismaClient({ log: logLevels });
  extended = base.$extends({ query: { $allOperations: withRecovery } });
};

// Re-issue an operation against whatever client is current. Goes through `base`
// rather than `extended` so a retry can't recurse back into this handler.
const dispatch = (model, operation, args) => {
  if (!model) return base[operation](args); // $queryRaw, $executeRaw, ...
  const delegate = model.charAt(0).toLowerCase() + model.slice(1);
  return base[delegate][operation](args);
};

async function withRecovery({ model, operation, args, query }) {
  try {
    return await query(args);
  } catch (err) {
    if (!isEnginePanic(err)) throw err;

    let lastErr = err;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const dead = base;
      build();
      try { await dead.$disconnect(); } catch (_) { /* already gone */ }
      // Give the host a moment; these panics cluster when the CPU is throttled.
      await new Promise((resolve) => { setTimeout(resolve, 250 * (attempt + 1)); });
      try {
        return await dispatch(model, operation, args);
      } catch (retryErr) {
        lastErr = retryErr;
        if (!isEnginePanic(retryErr)) throw retryErr;
      }
    }
    throw lastErr;
  }
}

build();

// Always resolve against the live client, so a replacement takes effect
// immediately for every caller.
module.exports = new Proxy(
  {},
  {
    get(_target, prop) {
      const value = extended[prop];
      return typeof value === 'function' ? value.bind(extended) : value;
    },
    has(_target, prop) {
      return prop in extended;
    },
  }
);
