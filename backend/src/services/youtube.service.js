const axios = require('axios');
const prisma = require('../config/prisma');

// YouTube Data API v3 (Google OAuth 2.0).
// Connect = Google sign-in granting the youtube.upload + youtube.readonly scopes;
// publish = resumable video upload. Tokens come from Google's OAuth endpoints and
// refresh against a long-lived refresh_token (access tokens live ~1h).
//
// NOTE on verification: until the Google Cloud project passes the YouTube API
// audit, videos uploaded via the API are locked to PRIVATE regardless of the
// requested privacyStatus (same idea as TikTok needing App Review). The upload
// still succeeds — it just lands as private until the audit is approved.
const AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://www.googleapis.com/youtube/v3';
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';

// youtube.upload = insert videos; youtube.readonly = read the channel (title,
// thumbnail, id) so we can label the connected account. Both are "restricted"
// Google scopes (work for test users while the app is in Testing mode).
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ');

const buildAuthUrl = ({ redirectUri, state, force }) => {
  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    // offline + consent = always return a refresh_token (Google only sends it on
    // the first consent unless prompt=consent is forced). "Add another account"
    // adds select_account so the user can pick a DIFFERENT Google account.
    access_type: 'offline',
    prompt: force ? 'consent select_account' : 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTH_BASE}?${params.toString()}`;
};

// Exchange the authorization code for tokens:
// { access_token, refresh_token, expires_in, scope, token_type }
const exchangeCodeForToken = async (code, redirectUri) => {
  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      code,
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data;
};

const refreshAccessToken = async (refreshToken) => {
  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data;
};

// Fetch the authenticated user's YouTube channel (id + title + avatar).
const getChannelInfo = async (accessToken) => {
  const res = await axios.get(`${API_BASE}/channels`, {
    params: { part: 'snippet', mine: 'true' },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const ch = res.data?.items?.[0];
  if (!ch) return {};
  return {
    id: ch.id,
    title: ch.snippet?.title,
    avatar: ch.snippet?.thumbnails?.default?.url || ch.snippet?.thumbnails?.medium?.url,
  };
};

// Google access tokens live ~1h. Scheduled posts fire later, so refresh against
// the stored refresh_token (long-lived) when expired and persist the new token.
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
      // Google usually does NOT return a new refresh_token on refresh — keep ours.
      refreshToken: data.refresh_token || account.refreshToken,
      tokenExpiry: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : account.tokenExpiry,
    },
  });
  return data.access_token;
};

// YouTube titles cap at 100 chars and reject < / >. Derive a sane title from the
// post text (first line), keeping the full text as the description.
const deriveTitle = (content) => {
  const firstLine = String(content || '').split('\n')[0].replace(/[<>]/g, '').trim();
  const t = (firstLine || 'Video').slice(0, 100);
  return t || 'Video';
};

// Upload a video to the channel via a resumable session. The video lives at a
// public URL (orciid.online/uploads/...); we download the bytes and PUT them.
// Returns the new video id.
const uploadVideo = async (accessToken, videoUrl, content) => {
  const metadata = {
    snippet: {
      title: deriveTitle(content),
      description: String(content || ''),
      categoryId: '22', // People & Blogs
    },
    status: {
      privacyStatus: 'public',
      selfDeclaredMadeForKids: false,
    },
  };

  // 1. Open a resumable upload session — Google returns the session URL in the
  //    Location response header.
  const initRes = await axios.post(
    `${UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
    metadata,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/*',
      },
    }
  );
  const sessionUrl = initRes.headers.location || initRes.headers.Location;
  if (!sessionUrl) throw new Error('YouTube did not return a resumable upload URL');

  // 2. Download the source video and PUT the bytes into the session.
  const videoResp = await axios.get(videoUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(videoResp.data);

  const putRes = await axios.put(sessionUrl, buffer, {
    headers: { 'Content-Type': 'video/*', 'Content-Length': buffer.length },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  return putRes.data?.id;
};

module.exports = {
  SCOPES,
  buildAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getChannelInfo,
  ensureFreshToken,
  uploadVideo,
};
