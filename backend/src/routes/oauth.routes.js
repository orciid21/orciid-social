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

// --- Facebook / Instagram ---
// NOTE: Requires passport-facebook. Configure in production with real credentials.
router.get('/facebook', (req, res) => {
  // Store token in session or state param for callback
  const { token } = req.query;
  const state = Buffer.from(JSON.stringify({ token })).toString('base64');
  const fbUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(process.env.FACEBOOK_CALLBACK_URL)}&state=${state}&scope=pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish`;
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
        redirect_uri: process.env.FACEBOOK_CALLBACK_URL,
        code,
      },
    });

    const { access_token } = tokenRes.data;
    const profileRes = await axios.get('https://graph.facebook.com/me', {
      params: { access_token, fields: 'id,name,picture' },
    });

    await saveSocialAccount(user.id, 'FACEBOOK', {
      platformId: profileRes.data.id,
      name: profileRes.data.name,
      avatar: profileRes.data.picture?.data?.url,
      accessToken: access_token,
    });

    res.redirect(`${FRONTEND}/accounts?connected=facebook`);
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
  const twitterUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTER_API_KEY}&redirect_uri=${encodeURIComponent(process.env.TWITTER_CALLBACK_URL)}&scope=tweet.read%20tweet.write%20users.read%20offline.access&state=${state}&code_challenge=challenge&code_challenge_method=plain`;
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
        redirect_uri: process.env.TWITTER_CALLBACK_URL,
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

// --- LinkedIn ---
router.get('/linkedin', (req, res) => {
  const { token } = req.query;
  const state = Buffer.from(JSON.stringify({ token })).toString('base64');
  const linkedinUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.LINKEDIN_CALLBACK_URL)}&state=${state}&scope=r_liteprofile%20r_emailaddress%20w_member_social`;
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
        redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token } = tokenRes.data;
    const profileRes = await axios.get('https://api.linkedin.com/v2/me', {
      params: { projection: '(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))' },
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const p = profileRes.data;
    await saveSocialAccount(user.id, 'LINKEDIN', {
      platformId: p.id,
      name: `${p.localizedFirstName} ${p.localizedLastName}`,
      accessToken: access_token,
    });

    res.redirect(`${FRONTEND}/accounts?connected=linkedin`);
  } catch (err) {
    console.error('LinkedIn OAuth error:', err.message);
    res.redirect(`${FRONTEND}/accounts?error=linkedin_failed`);
  }
});

module.exports = router;
