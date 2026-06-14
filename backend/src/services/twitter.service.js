const axios = require('axios');
const prisma = require('../config/prisma');

// Twitter/X OAuth 2.0 (user context). Access tokens live ~2 hours; the
// `offline.access` scope yields a refresh token (valid until revoked). A
// scheduled post may fire long after the access token expires, so refresh
// against the stored refresh token when expired and persist the new tokens.
const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';

const basicAuth = () =>
  Buffer.from(`${process.env.TWITTER_API_KEY}:${process.env.TWITTER_API_SECRET}`).toString('base64');

// Exchange a refresh token for a fresh access token. X rotates refresh tokens,
// so the response usually contains a NEW refresh_token that must be saved.
const refreshAccessToken = async (refreshToken) => {
  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.TWITTER_API_KEY,
    }),
    { headers: { Authorization: `Basic ${basicAuth()}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data; // { access_token, refresh_token, expires_in, scope, token_type }
};

// Return a usable access token for the account, refreshing + persisting if the
// stored one is expired (or about to expire within 60s).
const ensureFreshToken = async (account) => {
  const expired = !account.tokenExpiry || new Date(account.tokenExpiry).getTime() < Date.now() + 60_000;
  if (!expired) return account.accessToken;
  if (!account.refreshToken) return account.accessToken; // best effort — will 401 if truly expired

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

module.exports = { refreshAccessToken, ensureFreshToken };
