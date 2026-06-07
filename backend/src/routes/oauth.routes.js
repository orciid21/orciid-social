const router = require('express').Router();
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

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
  const twitterUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTER_API_KEY}&redirect_uri=${encodeURIComponent(redirect)}&scope=tweet.read%20tweet.write%20users.read%20offline.access&state=${state}&code_challenge=challenge&code_challenge_method=plain`;
  res.redirect(twitterUrl);
});

router.get('/twitter/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const { token } = JSON.parse(Buffer.from(state, 'base64').toString());
    const user = await getUserFromToken(token);
    if (!user) return res.redirect(`${FRONTEND}/accounts?error=auth_failed`);

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

    const { access_token, refresh_token } = tokenRes.data;
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

// --- Instagram (via Facebook Login — Instagram Graph API) ---
// Requires an Instagram BUSINESS/CREATOR account linked to a Facebook Page.
// Flow: FB OAuth -> list Pages -> find the Page's linked instagram_business_account.
// The Page access token (not the user token) is what publishes to Instagram.
router.get('/instagram', (req, res) => {
  const { token } = req.query;
  const state = Buffer.from(JSON.stringify({ token })).toString('base64');
  const appId = process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID;
  const redirect = process.env.INSTAGRAM_CALLBACK_URL || `${getOAuthBaseUrl()}/auth/instagram/callback`;
  const scope = 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management';
  const igUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect)}&state=${state}&scope=${scope}`;
  res.redirect(igUrl);
});

router.get('/instagram/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const { token } = JSON.parse(Buffer.from(state, 'base64').toString());
    const user = await getUserFromToken(token);
    if (!user) return res.redirect(`${FRONTEND}/accounts?error=auth_failed`);

    const axios = require('axios').default;
    const appId = process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
    const redirect = process.env.INSTAGRAM_CALLBACK_URL || `${getOAuthBaseUrl()}/auth/instagram/callback`;

    // 1. Exchange code for a user access token
    const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: { client_id: appId, client_secret: appSecret, redirect_uri: redirect, code },
    });
    const userToken = tokenRes.data.access_token;

    // 2. Find a Page with a linked Instagram business account
    const pagesRes = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
      params: { access_token: userToken, fields: 'id,name,access_token,instagram_business_account' },
    });
    const pageWithIg = (pagesRes.data.data || []).find((pg) => pg.instagram_business_account);
    if (!pageWithIg) {
      return res.redirect(`${FRONTEND}/accounts?error=no_instagram_business_account`);
    }

    // 3. Fetch the IG business account details (use the Page token going forward)
    const igId = pageWithIg.instagram_business_account.id;
    const igRes = await axios.get(`https://graph.facebook.com/v18.0/${igId}`, {
      params: { access_token: pageWithIg.access_token, fields: 'id,username,name,profile_picture_url' },
    });
    const ig = igRes.data;

    await saveSocialAccount(user.id, 'INSTAGRAM', {
      platformId: ig.id,
      name: ig.name || ig.username,
      username: ig.username,
      avatar: ig.profile_picture_url,
      accessToken: pageWithIg.access_token, // Page token publishes to IG
    });

    res.redirect(`${FRONTEND}/accounts?connected=instagram`);
  } catch (err) {
    console.error('Instagram OAuth error:', err.response?.data || err.message);
    res.redirect(`${FRONTEND}/accounts?error=instagram_failed`);
  }
});

module.exports = router;
