const crypto = require('crypto');
const router = require('express').Router();
const prisma = require('../config/prisma');

// TEMPORARY — one-shot database export before the Business plan lapses.
//
// The production database listens on localhost inside the hosting account, so
// nothing outside the server can reach it; this app can. The endpoint exists
// only to get the data out, and MUST be deleted immediately afterwards.
//
// The gate is derived from JWT_SECRET rather than being a new secret of its own:
// a fresh key written into the source would stay in git history forever, whereas
// this adds nothing that was not already secret. Compared timing-safely.
const expectedKey = () =>
  crypto.createHmac('sha256', process.env.JWT_SECRET || '').update('orciid-db-export-v1').digest('hex');

const TABLES = [
  'user', 'subscription', 'workspace', 'workspaceMember', 'invitation',
  'project', 'socialAccount', 'post', 'postAccount', 'postAnalytics',
];

router.get('/', async (req, res) => {
  const given = String(req.get('X-Export-Key') || '');
  const want = expectedKey();
  if (!process.env.JWT_SECRET || given.length !== want.length ||
      !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(want))) {
    return res.status(404).json({ error: 'Not found' });
  }

  const out = {};
  for (const t of TABLES) {
    try {
      out[t] = await prisma[t].findMany();
    } catch (err) {
      out[t] = { __error: String(err.message || err).slice(0, 200) };
    }
  }
  // Dates serialise to ISO strings by default; the importer parses them back.
  res.json({ exportedAt: new Date().toISOString(), tables: out });
});

module.exports = router;
