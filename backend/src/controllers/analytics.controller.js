const prisma = require('../config/prisma');


// Mirrors the post controller: a user's primary workspace, used to scope the
// approval queue to the whole team rather than just their own drafts.
const getMyWorkspace = async (userId) => {
  const m = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });
  return { workspaceId: m?.workspaceId || null };
};

const getOverview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalPosts, scheduledPosts, publishedPosts, accountsCount, analytics] = await Promise.all([
      prisma.post.count({ where: { userId } }),
      prisma.post.count({ where: { userId, status: 'SCHEDULED' } }),
      prisma.post.count({ where: { userId, status: 'PUBLISHED', publishedAt: { gte: since } } }),
      prisma.socialAccount.count({ where: { userId, isActive: true } }),
      prisma.postAnalytics.aggregate({
        where: { post: { userId }, fetchedAt: { gte: since } },
        _sum: { likes: true, comments: true, shares: true, reach: true, impressions: true },
      }),
    ]);

    res.json({
      totalPosts,
      scheduledPosts,
      publishedPosts,
      accountsCount,
      engagement: analytics._sum,
    });
  } catch (err) {
    next(err);
  }
};


// Three things worth knowing at a glance, across every project:
// what worked, what's gone quiet, and what's waiting on you.
const CHANNEL_FIELDS = {
  id: true, platform: true, platformId: true, name: true,
  username: true, avatar: true, projectId: true,
};

const getInsights = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const days = Number(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 1. Best post of the week — ranked by the interactions people actually
    //    make (likes + comments + shares), not by reach, which mostly reflects
    //    how far the network pushed it rather than whether it landed.
    const recentAnalytics = await prisma.postAnalytics.findMany({
      where: { post: { userId }, fetchedAt: { gte: since } },
      include: {
        post: {
          include: { accounts: { include: { socialAccount: { select: CHANNEL_FIELDS } } } },
        },
      },
    });

    let topPost = null;
    for (const row of recentAnalytics) {
      const score = (row.likes || 0) + (row.comments || 0) + (row.shares || 0);
      if (score > 0 && (!topPost || score > topPost.score)) {
        topPost = {
          score,
          likes: row.likes,
          comments: row.comments,
          shares: row.shares,
          impressions: row.impressions,
          platform: row.platform,
          post: {
            id: row.post.id,
            content: row.post.content,
            publishedAt: row.post.publishedAt,
            channels: row.post.accounts.map((pa) => pa.socialAccount),
          },
        };
      }
    }

    // 2. Channels that have gone quiet: connected, but nothing published in the
    //    window. A channel that has never posted counts too — that's the most
    //    likely one to have been forgotten after connecting it.
    const channels = await prisma.socialAccount.findMany({
      where: { userId, isActive: true },
      select: CHANNEL_FIELDS,
    });
    const lastPublished = await prisma.postAccount.groupBy({
      by: ['socialAccountId'],
      where: { socialAccount: { userId }, status: 'PUBLISHED' },
      _max: { publishedAt: true },
    });
    const lastByChannel = Object.fromEntries(
      lastPublished.map((r) => [r.socialAccountId, r._max.publishedAt])
    );
    const quietChannels = channels
      .map((ch) => ({ ...ch, lastPostedAt: lastByChannel[ch.id] || null }))
      .filter((ch) => !ch.lastPostedAt || new Date(ch.lastPostedAt) < since)
      .sort((a, b) => {
        if (!a.lastPostedAt) return -1;
        if (!b.lastPostedAt) return 1;
        return new Date(a.lastPostedAt) - new Date(b.lastPostedAt);
      });

    // 3. Waiting on a decision. The approval flow already exists; it just never
    //    surfaced anywhere you'd see it.
    const { workspaceId } = await getMyWorkspace(userId);
    const pendingWhere = workspaceId
      ? { status: 'PENDING_APPROVAL', OR: [{ userId }, { workspaceId }] }
      : { status: 'PENDING_APPROVAL', userId };

    const [pendingCount, pendingPosts] = await Promise.all([
      prisma.post.count({ where: pendingWhere }),
      prisma.post.findMany({
        where: pendingWhere,
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { accounts: { include: { socialAccount: { select: CHANNEL_FIELDS } } } },
      }),
    ]);

    res.json({
      windowDays: days,
      topPost,
      quietChannels: quietChannels.slice(0, 5),
      quietChannelCount: quietChannels.length,
      pendingApproval: { count: pendingCount, posts: pendingPosts },
    });
  } catch (err) {
    next(err);
  }
};

const getPostAnalytics = async (req, res, next) => {
  try {
    const analytics = await prisma.postAnalytics.findMany({
      where: { postId: req.params.postId, post: { userId: req.user.id } },
    });
    res.json(analytics);
  } catch (err) {
    next(err);
  }
};

const getAccountAnalytics = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const analytics = await prisma.postAnalytics.groupBy({
      by: ['platform'],
      where: { post: { userId: req.user.id }, fetchedAt: { gte: since } },
      _sum: { likes: true, comments: true, shares: true, reach: true, impressions: true },
    });

    res.json(analytics);
  } catch (err) {
    next(err);
  }
};

module.exports = { getOverview, getPostAnalytics, getAccountAnalytics, getInsights };
