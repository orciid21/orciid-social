const axios = require('axios');
const prisma = require('../config/prisma');
const tiktokService = require('./tiktok.service');

const publishers = {
  FACEBOOK: async (account, post) => {
    // account.platformId is the Page id; account.accessToken is the Page token.
    // Publishing to a Page (not the personal profile) is the supported path.
    const pageId = account.platformId;
    const media = Array.isArray(post.mediaUrls) ? post.mediaUrls.filter(Boolean) : [];

    if (media.length > 0) {
      const url = media[0];
      const isVideo = /\.(mp4|mov|m4v|webm|avi)(\?.*)?$/i.test(url);

      if (isVideo) {
        const res = await axios.post(
          `https://graph.facebook.com/v18.0/${pageId}/videos`,
          { file_url: url, description: post.content, access_token: account.accessToken }
        );
        return res.data.id;
      }

      const res = await axios.post(
        `https://graph.facebook.com/v18.0/${pageId}/photos`,
        { url, caption: post.content, access_token: account.accessToken }
      );
      return res.data.post_id || res.data.id;
    }

    const res = await axios.post(
      `https://graph.facebook.com/v18.0/${pageId}/feed`,
      { message: post.content, access_token: account.accessToken }
    );
    return res.data.id;
  },

  TWITTER: async (account, post) => {
    const res = await axios.post(
      'https://api.twitter.com/2/tweets',
      { text: post.content.slice(0, 280) },
      { headers: { Authorization: `Bearer ${account.accessToken}` } }
    );
    return res.data.data.id;
  },

  LINKEDIN: async (account, post) => {
    const res = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        author: `urn:li:person:${account.platformId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: post.content },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      },
      { headers: { Authorization: `Bearer ${account.accessToken}` } }
    );
    return res.data.id;
  },

  INSTAGRAM: async (account, post) => {
    if (!post.mediaUrls || post.mediaUrls.length === 0) {
      throw new Error('Instagram requires at least one image');
    }
    // Accounts are connected via the Instagram Login API (direct instagram.com
    // OAuth) — their tokens only work on graph.instagram.com, NOT
    // graph.facebook.com. platformId is the IG professional account id.
    const url = post.mediaUrls[0];
    const isVideo = /\.(mp4|mov|m4v|webm|avi)(\?.*)?$/i.test(url);

    // Create the media container (REELS is the supported feed video type).
    const containerRes = await axios.post(
      `https://graph.instagram.com/v21.0/${account.platformId}/media`,
      isVideo
        ? { media_type: 'REELS', video_url: url, caption: post.content, access_token: account.accessToken }
        : { image_url: url, caption: post.content, access_token: account.accessToken }
    );

    // Videos process asynchronously — wait until the container is ready.
    if (isVideo) {
      for (let i = 0; i < 30; i++) {
        const st = await axios.get(`https://graph.instagram.com/v21.0/${containerRes.data.id}`, {
          params: { fields: 'status_code', access_token: account.accessToken },
        });
        if (st.data.status_code === 'FINISHED') break;
        if (st.data.status_code === 'ERROR') throw new Error('Instagram could not process the video');
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    const publishRes = await axios.post(
      `https://graph.instagram.com/v21.0/${account.platformId}/media_publish`,
      { creation_id: containerRes.data.id, access_token: account.accessToken }
    );
    return publishRes.data.id;
  },

  TIKTOK: async (account, post) => {
    // TikTok Content Posting API. We have the video.upload scope (not
    // video.publish, which needs App Review), so the video is sent to the
    // creator's TikTok inbox as a draft — they tap the notification to finish.
    const media = Array.isArray(post.mediaUrls) ? post.mediaUrls.filter(Boolean) : [];
    const videoUrl = media.find((u) => /\.(mp4|mov|m4v|webm|avi)(\?.*)?$/i.test(u));
    if (!videoUrl) {
      throw new Error('TikTok requires a video file to publish.');
    }
    const token = await tiktokService.ensureFreshToken(account);
    const publishId = await tiktokService.uploadVideoDraft(token, videoUrl);
    return publishId;
  },
};

const publishPost = async (postId) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { accounts: { include: { socialAccount: true } } },
  });

  if (!post) throw new Error(`Post ${postId} not found`);

  const results = await Promise.allSettled(
    post.accounts.map(async (pa) => {
      const account = pa.socialAccount;
      const publisher = publishers[account.platform];

      if (!publisher) throw new Error(`No publisher for ${account.platform}`);

      try {
        const platformPostId = await publisher(account, post);
        await prisma.postAccount.update({
          where: { id: pa.id },
          data: { status: 'PUBLISHED', platformPostId, publishedAt: new Date() },
        });
        return { platform: account.platform, success: true };
      } catch (err) {
        // Surface the REAL platform error (e.g. Facebook's Graph API message),
        // not axios's generic "Request failed with status code 403". This is what
        // tells the user *why* a post failed — e.g. trying to publish to a personal
        // profile instead of a Page, or a missing permission.
        const apiErr = err.response?.data?.error;
        const reason = apiErr
          ? `${apiErr.message}${apiErr.code ? ` (#${apiErr.code})` : ''}`
          : err.message;
        await prisma.postAccount.update({
          where: { id: pa.id },
          data: { status: 'FAILED', failReason: String(reason).slice(0, 500) },
        });
        throw err;
      }
    })
  );

  const allFailed = results.every((r) => r.status === 'rejected');
  const allSuccess = results.every((r) => r.status === 'fulfilled');

  await prisma.post.update({
    where: { id: postId },
    data: {
      status: allFailed ? 'FAILED' : allSuccess ? 'PUBLISHED' : 'PUBLISHED',
      publishedAt: allFailed ? null : new Date(),
      failReason: allFailed ? 'All platforms failed' : null,
    },
  });
};

module.exports = { publishPost };
