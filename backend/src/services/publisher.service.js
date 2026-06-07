const axios = require('axios');
const prisma = require('../config/prisma');

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
    // Create container
    const containerRes = await axios.post(
      `https://graph.facebook.com/v18.0/${account.platformId}/media`,
      { image_url: post.mediaUrls[0], caption: post.content, access_token: account.accessToken }
    );
    // Publish container
    const publishRes = await axios.post(
      `https://graph.facebook.com/v18.0/${account.platformId}/media_publish`,
      { creation_id: containerRes.data.id, access_token: account.accessToken }
    );
    return publishRes.data.id;
  },

  TIKTOK: async (account, post) => {
    // TikTok Content Posting API
    throw new Error('TikTok publishing coming soon');
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
