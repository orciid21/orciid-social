const crypto = require('crypto');
const router = require('express').Router();
const prisma = require('../config/prisma');

// Meta's deauthorize and data-deletion callbacks.
//
// Both are required before App Review, and both are called by Facebook — never
// by a browser — with a `signed_request` body. That request is the only
// authentication there is, so it MUST be verified: without the signature check
// anyone who learns these URLs could disconnect another user's channels or
// trigger a deletion by posting a handcrafted payload.
//
// Format: base64url(HMAC-SHA256 signature) + "." + base64url(JSON payload),
// signed with the app secret. Facebook documents the algorithm; we reject
// anything that does not match.
const b64url = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

const parseSignedRequest = (signedRequest, appSecret) => {
  if (!signedRequest || !appSecret) return null;
  const [sigPart, payloadPart] = String(signedRequest).split('.');
  if (!sigPart || !payloadPart) return null;

  const expected = crypto.createHmac('sha256', appSecret).update(payloadPart).digest();
  const given = b64url(sigPart);
  // timingSafeEqual throws on length mismatch, which is itself a failed match.
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;

  try {
    return JSON.parse(b64url(payloadPart).toString('utf8'));
  } catch (err) {
    return null;
  }
};

// Disconnect every channel belonging to a Meta user id. Deactivates rather than
// deletes: the posts already published through those channels keep their history,
// and reconnecting later restores the same row.
const disconnectByPlatformUser = async (platformUserId) => {
  if (!platformUserId) return 0;
  const res = await prisma.socialAccount.updateMany({
    where: { platform: { in: ['FACEBOOK', 'INSTAGRAM', 'THREADS'] }, platformId: String(platformUserId) },
    data: { isActive: false },
  });
  return res.count;
};

// POST /api/meta/deauthorize — fired when someone removes the app from their
// Facebook account. Meta ignores the response body; it only needs a 200.
router.post('/deauthorize', async (req, res) => {
  const data = parseSignedRequest(req.body?.signed_request, process.env.FACEBOOK_APP_SECRET);
  if (!data) return res.status(400).json({ error: 'Invalid signed_request' });
  try {
    const n = await disconnectByPlatformUser(data.user_id);
    console.log(`Meta deauthorize for user_id ${data.user_id}: ${n} channel(s) deactivated`);
  } catch (err) {
    console.error('Meta deauthorize error:', err.message);
  }
  res.status(200).json({ ok: true });
});

// POST /api/meta/data-deletion — Meta requires a JSON reply carrying a status URL
// the person can open, plus a confirmation code, so the request can be traced.
router.post('/data-deletion', async (req, res) => {
  const data = parseSignedRequest(req.body?.signed_request, process.env.FACEBOOK_APP_SECRET);
  if (!data) return res.status(400).json({ error: 'Invalid signed_request' });

  const confirmationCode = crypto.randomBytes(8).toString('hex');
  try {
    const n = await disconnectByPlatformUser(data.user_id);
    console.log(`Meta data deletion ${confirmationCode} for user_id ${data.user_id}: ${n} channel(s) deactivated`);
  } catch (err) {
    console.error('Meta data deletion error:', err.message);
  }

  const base = process.env.FRONTEND_URL || 'https://orciid.online';
  res.json({
    url: `${base}/legal#data-deletion`,
    confirmation_code: confirmationCode,
  });
});

module.exports = router;
