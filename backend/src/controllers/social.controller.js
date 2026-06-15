const axios = require('axios');
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/error.middleware');
const { FB_GRAPH, fbPagePicture, fetchManageablePages } = require('../services/facebook.service');

const getAccounts = async (req, res, next) => {
  try {
    const accounts = await prisma.socialAccount.findMany({
      where: { userId: req.user.id, isActive: true },
      orderBy: { createdAt: 'desc' },
      // Never send accessToken/refreshToken to the browser — Page tokens are
      // server-side secrets.
      select: {
        id: true,
        platform: true,
        platformId: true,
        name: true,
        username: true,
        avatar: true,
        isActive: true,
        createdAt: true,
      },
    });
    res.json(accounts);
  } catch (err) {
    next(err);
  }
};

const disconnectAccount = async (req, res, next) => {
  try {
    const account = await prisma.socialAccount.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!account) throw new AppError('Account not found', 404);

    await prisma.socialAccount.update({
      where: { id: account.id },
      data: { isActive: false },
    });

    res.json({ message: 'Account disconnected' });
  } catch (err) {
    next(err);
  }
};

// The API and frontend are both served from the same origin (orciid.online).
// There is NO separate api.orciid.online subdomain — it does not resolve.
// Override with API_URL env if the deployment ever moves to a dedicated host.
const getApiBaseUrl = () => {
  if (process.env.API_URL) return process.env.API_URL.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') return 'https://orciid.online';
  return `http://localhost:${process.env.PORT || 5000}`;
};

const getConnectUrl = (req, res) => {
  const { platform } = req.params;
  const baseUrl = getApiBaseUrl();
  const token = req.headers.authorization?.split(' ')[1];

  const urls = {
    FACEBOOK: `${baseUrl}/auth/facebook?token=${token}`,
    TWITTER: `${baseUrl}/auth/twitter?token=${token}`,
    LINKEDIN: `${baseUrl}/auth/linkedin?token=${token}`,
    TIKTOK: `${baseUrl}/auth/tiktok?token=${token}`,
    INSTAGRAM: `${baseUrl}/auth/instagram?token=${token}`,
    THREADS: `${baseUrl}/auth/threads?token=${token}`,
  };

  const url = urls[platform.toUpperCase()];
  if (!url) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }

  res.json({ url });
};

// GET /social/facebook/pages
// List the Facebook Pages the user manages so they can choose which to connect.
// Runs after the FB OAuth callback, which stashed a user token on req.user.
const getFacebookPages = async (req, res, next) => {
  try {
    const userToken = req.user.fbConnectToken;
    if (!userToken) {
      throw new AppError('Facebook is not connected. Please connect Facebook first.', 400);
    }

    const fbPages = await fetchManageablePages(userToken);

    // Mark Pages that are already connected so the UI can show them as added.
    const existing = await prisma.socialAccount.findMany({
      where: { userId: req.user.id, platform: 'FACEBOOK', isActive: true },
      select: { platformId: true },
    });
    const connectedIds = new Set(existing.map((a) => a.platformId));

    // IMPORTANT: never expose Page access tokens to the client.
    const pages = fbPages.map((pg) => ({
      id: pg.id,
      name: pg.name,
      category: pg.category,
      avatar: fbPagePicture(pg.id),
      followers: pg.fan_count ?? null,
      alreadyConnected: connectedIds.has(pg.id),
    }));

    res.json({ pages });
  } catch (err) {
    if (err.response) {
      return next(new AppError(err.response.data?.error?.message || 'Failed to load Facebook Pages', 400));
    }
    next(err);
  }
};

// POST /social/facebook/pages/connect   body: { pageIds: [...] }
// Connect the chosen Pages (each with its own Page access token) and deactivate
// any FACEBOOK account the user did NOT pick — including the old personal profile.
const connectFacebookPages = async (req, res, next) => {
  try {
    const userToken = req.user.fbConnectToken;
    if (!userToken) {
      throw new AppError('Facebook is not connected. Please connect Facebook first.', 400);
    }

    const pageIds = Array.isArray(req.body.pageIds) ? req.body.pageIds.filter(Boolean) : [];
    if (pageIds.length === 0) {
      throw new AppError('Select at least one Page', 400);
    }

    // Re-fetch Pages server-side to obtain fresh Page tokens (never trust the client).
    // Same merged enumeration (/me/accounts + /me/assigned_pages) so Business-owned
    // Pages can be connected, not just personally-administered ones.
    const fbPages = await fetchManageablePages(userToken);
    const chosen = fbPages.filter((pg) => pageIds.includes(pg.id));

    if (chosen.length === 0) {
      throw new AppError('Selected Pages were not found on your Facebook account', 400);
    }

    // Upsert each chosen Page as a FACEBOOK social account.
    for (const pg of chosen) {
      await prisma.socialAccount.upsert({
        where: {
          userId_platform_platformId: {
            userId: req.user.id,
            platform: 'FACEBOOK',
            platformId: pg.id,
          },
        },
        update: {
          name: pg.name,
          avatar: fbPagePicture(pg.id),
          accessToken: pg.access_token,
          isActive: true,
        },
        create: {
          userId: req.user.id,
          platform: 'FACEBOOK',
          platformId: pg.id,
          name: pg.name,
          avatar: fbPagePicture(pg.id),
          accessToken: pg.access_token,
        },
      });
    }

    // Deactivate FB accounts not chosen (removes the old "personal profile" account).
    await prisma.socialAccount.updateMany({
      where: {
        userId: req.user.id,
        platform: 'FACEBOOK',
        platformId: { notIn: chosen.map((pg) => pg.id) },
      },
      data: { isActive: false },
    });

    // Clear the temporary connect token.
    await prisma.user.update({
      where: { id: req.user.id },
      data: { fbConnectToken: null },
    });

    const accounts = await prisma.socialAccount.findMany({
      where: { userId: req.user.id, platform: 'FACEBOOK', isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ connected: chosen.length, accounts });
  } catch (err) {
    if (err.response) {
      return next(new AppError(err.response.data?.error?.message || 'Failed to connect Facebook Pages', 400));
    }
    next(err);
  }
};

// TEMP DEBUG: GET /social/facebook/debug
// Dumps raw Graph responses to find WHERE the granted Page lives (e.g. a
// Business-owned Page won't show in the personal /me/accounts edge). Tokens are
// redacted. REMOVE once the Page-listing path is fixed.
const debugFacebook = async (req, res) => {
  const userToken = req.user.fbConnectToken;
  if (!userToken) return res.status(400).json({ error: 'No fbConnectToken on user' });

  const safe = async (label, url, params) => {
    try {
      const r = await axios.get(url, { params: { access_token: userToken, ...params } });
      return { label, ok: true, data: r.data };
    } catch (e) {
      return { label, ok: false, error: e.response?.data?.error || String(e) };
    }
  };

  const out = {};
  out.me = await safe('me', `${FB_GRAPH}/me`, { fields: 'id,name' });
  out.permissions = await safe('permissions', `${FB_GRAPH}/me/permissions`, {});
  out.accounts = await safe('accounts', `${FB_GRAPH}/me/accounts`, { fields: 'id,name,access_token', limit: 100 });
  out.assignedPages = await safe('assigned_pages', `${FB_GRAPH}/me/assigned_pages`, { fields: 'id,name,access_token,tasks', limit: 100 });
  const appToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
  out.debugToken = await safe('debug_token', `${FB_GRAPH}/debug_token`, { input_token: userToken, access_token: appToken });
  out.businesses = await safe('businesses', `${FB_GRAPH}/me/businesses`, { fields: 'id,name', limit: 100 });
  out.hrSocietyDirect = await safe('hr_direct', `${FB_GRAPH}/204598046065905`, { fields: 'id,name,access_token' });

  const bizPages = [];
  if (out.businesses.ok) {
    for (const b of out.businesses.data.data || []) {
      bizPages.push(await safe(`owned_pages:${b.name}`, `${FB_GRAPH}/${b.id}/owned_pages`, { fields: 'id,name,access_token', limit: 100 }));
      bizPages.push(await safe(`client_pages:${b.name}`, `${FB_GRAPH}/${b.id}/client_pages`, { fields: 'id,name,access_token', limit: 100 }));
    }
  }
  out.bizPages = bizPages;

  const redacted = JSON.parse(JSON.stringify(out, (k, v) => (k === 'access_token' ? '[PRESENT]' : v)));
  res.json(redacted);
};

module.exports = {
  getAccounts,
  disconnectAccount,
  getConnectUrl,
  getFacebookPages,
  connectFacebookPages,
  debugFacebook,
};
