const axios = require('axios');
const prisma = require('../config/prisma');

// TikTok Login Kit + Content Posting API (v2).
// We run against the app's SANDBOX (client key starts with "sb...") until the
// production app passes TikTok App Review — same pattern as Facebook dev mode.
// The connecting TikTok account must be added as a Target User in the Sandbox.
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || 'sbawh3wl4ohgo8jmmg';
const AUTH_BASE = 'https://www.tiktok.com/v2/auth/authorize/';
const API_BASE = 'https://open.tiktokapis.com/v2';

// Scopes granted to the Sandbox: profile read + draft upload. video.publish
// (direct posting) needs App Review, so we upload to the user's TikTok inbox
// and they tap the notification to finish — exactly how Buffer behaves for
// not-yet-reviewed TikTok apps.
const SCOPES = 'user.info.basic,video.upload';

const buildAuthUrl = ({ redirectUri, state }) => {
  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    scope: SCOPES,
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH_BASE}?${params.toString()}`;
};

// Exchange the authorization code for tokens. Returns the raw token payload:
// { access_token, refresh_token, open_id, expires_in, refresh_expires_in, scope }
const exchangeCodeForToken = async (code, redirectUri) => {
  const res = await axios.post(
    `${API_BASE}/oauth/token/`,
    new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data;
};

const refreshAccessToken = async (refreshToken) => {
  const res = await axios.post(
    `${API_BASE}/oauth/token/`,
    new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data;
};

const getUserInfo = async (accessToken) => {
  const res = await axios.get(`${API_BASE}/user/info/`, {
    params: { fields: 'open_id,union_id,display_name,avatar_url' },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data?.data?.user || {};
};

// TikTok access tokens live ~24h. A scheduled post may fire after that, so
// refresh against the stored refresh token (valid ~365 days) when expired and
// persist the new tokens. Returns a usable access token.
const ensureFreshToken = async (account) => {
  const expired = !account.tokenExpiry || new Date(account.tokenExpiry).getTime() < Date.now() + 60_000;
  if (!expired) return account.accessToken;
  if (!account.refreshToken) return account.accessToken; // best effort

  const data = await refreshAccessToken(account.refreshToken);
  if (!data.access_token) return account.accessToken;
  await prisma.socialAccount.update({
    where: { id: account.id },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || account.refreshToken,
      tokenExpiry: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : account.tokenExpiry,
    },
  });
  return data.access_token;
};

// Upload a video to the creator's TikTok inbox as a draft (Content Posting API).
// PULL_FROM_URL needs the video URL's domain to be a verified URL-prefix
// property — orciid.online is verified, and our uploads live there. The creator
// gets a TikTok notification and finishes posting in the app.
const uploadVideoDraft = async (accessToken, videoUrl) => {
  const res = await axios.post(
    `${API_BASE}/post/publish/inbox/video/init/`,
    { source_info: { source: 'PULL_FROM_URL', video_url: videoUrl } },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );
  const err = res.data?.error;
  if (err && err.code && err.code !== 'ok') {
    throw new Error(`${err.message || err.code}${err.code ? ` (${err.code})` : ''}`);
  }
  return res.data?.data?.publish_id;
};

module.exports = {
  TIKTOK_CLIENT_KEY,
  SCOPES,
  buildAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getUserInfo,
  ensureFreshToken,
  uploadVideoDraft,
};
