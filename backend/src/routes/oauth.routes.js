const router = require('express').Router();
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const tiktokService = require('../services/tiktok.service');

// Helper to get user from token in query string (passed during OAuth redirect)
const getUserFromToken = async (token) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await prisma.user.findUnique({ where: { id: decoded.userId } });
  } catch {
    return null;
  }
};

// Upsert social account
const saveSocialAccount = async (userId, platform, profileData) => {
  return prisma.socialAccount.upsert({
    where: { userId_platform_platformId: { userId, platform, platformId: profileData.platformId } },
    update: {
      name: profileData.name,
      username: profileData.username,
      avatar: profileData.avatar,
      accessToken: profileData.accessToken,
      refreshToken: profileData.refreshToken,
      tokenExpiry: profileData.tokenExpiry,
      isActive: true,
    },
    create: {
      userId,
      platform,
      platformId: profileData.platformId,
      name: profileData.name,
      username: profileData.username,
      avatar: profileData.avatar,
      accessToken: profileData.accessToken,
      refreshToken: profileData.refreshToken,
      tokenExpiry: profileData.tokenExpiry,
    },
  });
};

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';

// Base URL of THIS API server. The API + frontend share one origin (orciid.online);
// there is no api.orciid.online subdomain. Used to build OAuth callback URLs when
// a platform-specific *_CALLBACK_URL env var is not set.
const getOAuthBaseUrl = () => {
  if (process.env.API_URL) return process.env.API_URL.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') return 'https://orciid.online';
  return `http://localhost:${process.env.PORT || 5000}`;
};

// Callback URL for a platform. Prefer an explicit *_CALLBACK_URL env var (must match
// the developer-portal registration exactly); otherwise auto-derive from the origin.
const callbackUrl = (platform, envVar) =>
  process.env[envVar] || `${getOAuthBaseUrl()}/auth/${platform}/callback`;

// --- Facebook / Instagram ---
// NOTE: Requires passport-facebook. Configure in production with real credentials.
router.get('/facebook', (req, res) => {
  // Store token in session or state param for callback
  const { token } = req.query;
  const state = Buffer.from(JSON.stringify({ token })).toString('base64');
  const redirect = callbackUrl('facebook', 'FACEBOOK_CALLBACK_URL');
  // This is a "Business"-type Facebook app, so it uses **Facebook Login for
  // Business**. That flow is driven by a Login Configuration (config_id) created
  // in the App Dashboard — NOT by a raw `scope` list. Passing `scope` (the old
  // consumer-login flow) is exactly what made /me/accounts come back empty, so
  // the Page picker showed "No Pages found".
  //
  // The configuration "Orciid Publishing" (config_id below) requests
  // pages_show_list + pages_manage_posts + pages_read_engagement and uses a User
  // access token, so at login Facebook shows the Page-selection screen and
  // /me/accounts returns the chosen Page(s) with their Page tokens.
  // Overridable via FACEBOOK_CONFIG_ID env var if the configuration is recreated.
  const configId = process.env.FACEBOOK_CONFIG_ID || '2746900285685810';
  const fbUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&config_id=${configId}&redirect_uri=${encodeURIComponent(redirect)}&state=${state}&response_type=code`;
  res.redirect(fbUrl);
});

router.get('/facebook/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const { token } = JSON.parse(Buffer.from(state, 'base64').toString());
    const user = await getUserFromToken(token);
    if (!user) return res.redirect(`${FRONTEND}/accounts?error=auth_failed`);

    // Exchange code for access token
    const axios = require('axios').default;
    const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: callbackUrl('facebook', 'FACEBOOK_CALLBACK_URL'),
        code,
      },
    });

    const { access_token } = tokenRes.data;

    // Exchange the short-lived user token for a long-lived one (~60 days).
    // Page tokens derived from a long-lived user token do not expire, which is
    // what we want for publishing to the user's Pages.
    let longLivedToken = access_token;
    try {
      const llRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          fb_exchange_token: access_token,
        },
      });
      if (llRes.data.access_token) longLivedToken = llRes.data.access_token;
    } catch (e) {
      console.error('FB long-lived token exchange failed:', e.response?.data || e.message);
    }

    // Don't connect the personal profile. Stash the user token so the next step
    // can list the user's Pages and let them choose which Page(s) to connect.
    await prisma.user.update({
      where: { id: user.id },
      data: { fbConnectToken: longLivedToken },
    });

    res.redirect(`${FRONTEND}/accounts?select=facebook`);
  } catch (err) {
    console.error('Facebook OAuth error:', err.message);
    res.redirect(`${FRONTEND}/accounts?error=facebook_failed`);
  }
});

// --- Twitter/X ---
router.get('/twitter', (req, res) => {
  const { token } = req.query;
  // Twitter OAuth 2.0 PKCE
  const state = Buffer.from(JSON.stringify({ token })).toString('base64');
  const redirect = callbackUrl('twitter', 'TWITTER_CALLBACK_URL');
  // Use x.com (not the legacy twitter.com) for the authorize step — X migrated
  // to x.com and a user logged in on x.com isn't recognized by twitter.com's
  // OAuth page, which forces a re-login loop. x.com sees the existing session.
  const twitterUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTER_API_KEY}&redirect_uri=${encodeURIComponent(redirect)}&scope=tweet.read%20tweet.write%20users.read%20offline.access&state=${state}&code_challenge=challenge&code_challenge_method=plain`;
  res.redirect(twitterUrl);
});

router.get('/twitter/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const { token } = JSON.parse(Buffer.from(state, 'base64').toString());
    const user = await getUserFromToken(token);
    if (!user) return res.redirect(`${FRONTEND}/accounts?error=auth_failed`);

    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
      console.error('TWITTER_API_KEY/SECRET not set — add them in Hostinger env vars');
      return res.redirect(`${FRONTEND}/accounts?error=twitter_not_configured`);
    }

    const axios = require('axios').default;
    const credentials = Buffer.from(`${process.env.TWITTER_API_KEY}:${process.env.TWITTER_API_SECRET}`).toString('base64');

    const tokenRes = await axios.post('https://api.twitter.com/2/oauth2/token',
      new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl('twitter', 'TWITTER_CALLBACK_URL'),
        code_verifier: 'challenge',
      }),
      { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    const profileRes = await axios.get('https://api.twitter.com/2/users/me', {
      params: { 'user.fields': 'name,username,profile_image_url' },
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = profileRes.data.data;
    await saveSocialAccount(user.id, 'TWITTER', {
      platformId: profile.id,
      name: profile.name,
      username: profile.username,
      avatar: profile.profile_image_url,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiry: expires_in ? new Date(Date.now() + expires_in * 1000) : null,
    });

    res.redirect(`${FRONTEND}/accounts?connected=twitter`);
  } catch (err) {
    console.error('Twitter OAuth error:', err.message);
    res.redirect(`${FRONTEND}/accounts?error=twitter_failed`);
  }
});

// --- LinkedIn (OpenID Connect — current API) ---
// NOTE: The old r_liteprofile / r_emailaddress scopes and /v2/me projection are
// deprecated. LinkedIn now uses OIDC: scopes "openid profile email" for identity
// + "w_member_social" for posting, and the /v2/userinfo endpoint.
router.get('/linkedin', (req, res) => {
  const { token } = req.query;
  const state = Buffer.from(JSON.stringify({ token })).toString('base64');
  const scope = encodeURIComponent('openid profile email w_member_social');
  const redirect = callbackUrl('linkedin', 'LINKEDIN_CALLBACK_URL');
  const linkedinUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect)}&state=${state}&scope=${scope}`;
  res.redirect(linkedinUrl);
});

router.get('/linkedin/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const { token } = JSON.parse(Buffer.from(state, 'base64').toString());
    const user = await getUserFromToken(token);
    if (!user) return res.redirect(`${FRONTEND}/accounts?error=auth_failed`);

    if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
      console.error('LINKEDIN_CLIENT_ID/SECRET not set — add them in Hostinger env vars');
      return res.redirect(`${FRONTEND}/accounts?error=linkedin_not_configured`);
    }

    const axios = require('axios').default;
    const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl('linkedin', 'LINKEDIN_CALLBACK_URL'),
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token } = tokenRes.data;
    // OIDC userinfo: returns { sub, name, given_name, family_name, email, picture }
    const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const p = profileRes.data;
    await saveSocialAccount(user.id, 'LINKEDIN', {
      platformId: p.sub,
      name: p.name || `${p.given_name || ''} ${p.family_name || ''}`.trim(),
      username: p.email,
      avatar: p.picture,
      accessToken: access_token,
    });

    res.redirect(`${FRONTEND}/accounts?connected=linkedin`);
  } catch (err) {
    console.error('LinkedIn OAuth error:', err.response?.data || err.message);
    res.redirect(`${FRONTEND}/accounts?error=linkedin_failed`);
  }
});

// --- Instagram (Instagram Login API — the Buffer-style direct flow) ---
// The user logs in with their INSTAGRAM account on instagram.com and approves
// the consent screen — no Facebook Page linkage required. Needs the app's
// "Instagram > API setup with Instagram login" product: its own app id/secret
// and the redirect URL registered there. Tokens live on graph.instagram.com.
const IG_LOGIN_APP_ID = process.env.INSTAGRAM_APP_ID || '1402647338362389'; // ORCiiD Chat-IG
const IG_GRAPH = 'https://graph.instagram.com';

router.get('/instagram', (req, res) => {
  const { token } = req.query;
  const state = Buffer.from(JSON.stringify({ token })).toString('base64');
  const redirect = process.env.INSTAGRAM_CALLBACK_URL || `${getOAuthBaseUrl()}/auth/instagram/callback`;
  // Publishing needs only basic + content_publish; a shorter consent screen
  // converts better. Comments/messages scopes can be added when those ship.
  const scope = 'instagram_business_basic,instagram_business_content_publish';
  const igUrl = `https://www.instagram.com/oauth/authorize?client_id=${IG_LOGIN_APP_ID}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
  res.redirect(igUrl);
});

router.get('/instagram/callback', async (req, res) => {
  try {
    const { code, state, error_description: errDesc } = req.query;
    if (!code) {
      console.error('Instagram login denied/failed:', errDesc || req.query.error || 'no code');
      return res.redirect(`${FRONTEND}/accounts?error=instagram_failed`);
    }
    const { token } = JSON.parse(Buffer.from(state, 'base64').toString());
    const user = await getUserFromToken(token);
    if (!user) return res.redirect(`${FRONTEND}/accounts?error=auth_failed`);

    const axios = require('axios').default;
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    if (!appSecret) {
      console.error('INSTAGRAM_APP_SECRET is not set — add it in Hostinger env vars');
      return res.redirect(`${FRONTEND}/accounts?error=instagram_not_configured`);
    }
    const redirect = process.env.INSTAGRAM_CALLBACK_URL || `${getOAuthBaseUrl()}/auth/instagram/callback`;

    // 1. Exchange the code for a short-lived Instagram user token.
    const tokenRes = await axios.post(
      'https://api.instagram.com/oauth/access_token',
      new URLSearchParams({
        client_id: IG_LOGIN_APP_ID,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirect,
        code,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const shortToken = tokenRes.data.access_token;

    // 2. Upgrade to a long-lived token (~60 days) — short-lived ones die in an
    //    hour and would silently break publishing.
    const llRes = await axios.get(`${IG_GRAPH}/access_token`, {
      params: { grant_type: 'ig_exchange_token', client_secret: appSecret, access_token: shortToken },
    });
    const accessToken = llRes.data.access_token || shortToken;
    const expiresIn = llRes.data.expires_in;

    // 3. Fetch the professional account's profile.
    const meRes = await axios.get(`${IG_GRAPH}/me`, {
      params: { fields: 'user_id,username,name,profile_picture_url', access_token: accessToken },
    });
    const ig = meRes.data;
    const igId = String(ig.user_id || ig.id);

    await saveSocialAccount(user.id, 'INSTAGRAM', {
      platformId: igId,
      name: ig.name || ig.username,
      username: ig.username,
      avatar: ig.profile_picture_url,
      accessToken,
      tokenExpiry: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
    });

    res.redirect(`${FRONTEND}/accounts?connected=instagram`);
  } catch (err) {
    console.error('Instagram OAuth error:', err.response?.data || err.message);
    res.redirect(`${FRONTEND}/accounts?error=instagram_failed`);
  }
});

// --- TikTok (Login Kit + Content Posting API, v2) ---
// Runs against the app Sandbox until App Review passes. The connecting account
// must be a Sandbox Target User. Tokens live on open.tiktokapis.com.
router.get('/tiktok', (req, res) => {
  const { token } = req.query;
  const state = Buffer.from(JSON.stringify({ token })).toString('base64');
  const redirect = callbackUrl('tiktok', 'TIKTOK_CALLBACK_URL');
  res.redirect(tiktokService.buildAuthUrl({ redirectUri: redirect, state }));
});

router.get('/tiktok/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;
    if (oauthError || !code) {
      console.error('TikTok auth denied/failed:', oauthError || 'no code');
      return res.redirect(`${FRONTEND}/accounts?error=tiktok_failed`);
    }
    const { token } = JSON.parse(Buffer.from(state, 'base64').toString());
    const user = await getUserFromToken(token);
    if (!user) return res.redirect(`${FRONTEND}/accounts?error=auth_failed`);

    if (!process.env.TIKTOK_CLIENT_SECRET) {
      console.error('TIKTOK_CLIENT_SECRET is not set — add it in Hostinger env vars');
      return res.redirect(`${FRONTEND}/accounts?error=tiktok_not_configured`);
    }

    const redirect = callbackUrl('tiktok', 'TIKTOK_CALLBACK_URL');
    const tk = await tiktokService.exchangeCodeForToken(code, redirect);
    if (!tk.access_token) {
      console.error('TikTok token exchange failed:', tk);
      return res.redirect(`${FRONTEND}/accounts?error=tiktok_failed`);
    }

    const profile = await tiktokService.getUserInfo(tk.access_token).catch(() => ({}));
    await saveSocialAccount(user.id, 'TIKTOK', {
      platformId: tk.open_id,
      name: profile.display_name || profile.username || 'TikTok',
      username: profile.username || profile.display_name,
      avatar: profile.avatar_url,
      accessToken: tk.access_token,
      refreshToken: tk.refresh_token,
      tokenExpiry: tk.expires_in ? new Date(Date.now() + tk.expires_in * 1000) : undefined,
    });

    res.redirect(`${FRONTEND}/accounts?connected=tiktok`);
  } catch (err) {
    console.error('TikTok OAuth error:', err.response?.data || err.message);
    res.redirect(`${FRONTEND}/accounts?error=tiktok_failed`);
  }
});

module.exports = router;
