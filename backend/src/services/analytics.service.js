const axios = require('axios');
const prisma = require('../config/prisma');

/* Engagement collection.
 *
 * Publishing already records each post's id on the platform (PostAccount
 * .platformPostId), but nothing ever went back to ask how those posts did — so
 * PostAnalytics was only ever read, never written, and every engagement number
 * in the product was zero. This fills that gap: for each published post we ask
 * the network for its counts and store a dated snapshot, which is what makes a
 * real "engagement over time" chart possible.
 *
 * Snapshots are kept rather than overwritten: each row is "this is what the post
 * had on this date", so a series can be drawn and growth can be seen.
 */

const FB_GRAPH = 'https://graph.facebook.com/v18.0';
const IG_GRAPH = 'https://graph.instagram.com/v21.0';

const zero = { likes: 0, comments: 0, shares: 0, reach: 0, clicks: 0, impressions: 0 };

// Each collector returns counts, or null when the platform can't tell us
// (missing permission, deleted post, unsupported network).
const collectors = {
  // Page tokens carry pages_read_engagement, so the summary counts come back
  // on the post itself — no separate insights call, which keeps this to one
  // request per post.
  FACEBOOK: async (account, platformPostId) => {
    const res = await axios.get(`${FB_GRAPH}/${platformPostId}`, {
      params: {
        fields: 'likes.summary(true).limit(0),comments.summary(true).limit(0),shares',
        access_token: account.accessToken,
      },
      timeout: 15000,
    });
    const d = res.data || {};
    return {
      ...zero,
      likes: d.likes?.summary?.total_count || 0,
      comments: d.comments?.summary?.total_count || 0,
      shares: d.shares?.count || 0,
    };
  },

  // Basic counts only. Reach/impressions would need the
  // instagram_business_manage_insights permission, which the connect flow does
  // not request today, so we deliberately don't ask for them here.
  INSTAGRAM: async (account, platformPostId) => {
    const res = await axios.get(`${IG_GRAPH}/${platformPostId}`, {
      params: { fields: 'like_count,comments_count', access_token: account.accessToken },
      timeout: 15000,
    });
    const d = res.data || {};
    return { ...zero, likes: d.like_count || 0, comments: d.comments_count || 0 };
  },
};

// Collect for posts published recently. Older posts stop changing much, and
// every request costs the host a little, so the window is deliberately short.
const collectEngagement = async ({ days = 30, limit = 60 } = {}) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const targets = await prisma.postAccount.findMany({
    where: {
      status: 'PUBLISHED',
      platformPostId: { not: null },
      publishedAt: { gte: since },
      socialAccount: { isActive: true, platform: { in: Object.keys(collectors) } },
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    include: { socialAccount: true },
  });

  let stored = 0;
  let skipped = 0;

  for (const target of targets) {
    const platform = target.socialAccount.platform;
    try {
      const counts = await collectors[platform](target.socialAccount, target.platformPostId);
      if (!counts) { skipped += 1; continue; }
      await prisma.postAnalytics.create({
        data: { postId: target.postId, platform, ...counts },
      });
      stored += 1;
    } catch (err) {
      // A single unreachable post must never stop the run — tokens expire,
      // posts get deleted, and permissions differ per account.
      skipped += 1;
    }
  }

  return { checked: targets.length, stored, skipped };
};

module.exports = { collectEngagement, collectors };
