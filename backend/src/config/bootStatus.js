// Boot-time maintenance status, shared between server.js (which runs the
// migration steps) and app.js (which reports them on /health).
//
// Why this exists: ensureColumns/ensureIndexes run in the background after the
// server starts listening, and their only output was an appendFile to a log on
// the host's disk — not reachable over HTTP, so there was no way to confirm from
// outside whether a schema change had actually landed in production.
//
// Only COUNTS are published, never table, column or index names: the point is to
// answer "did boot maintenance finish cleanly?", not to describe the schema to
// anyone who curls /health.
const bootStatus = {
  indexes: null, // { created, skipped, failed } once ensureIndexes has run
};

module.exports = bootStatus;
