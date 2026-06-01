const prisma = require('../config/prisma');

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

module.exports = { getOverview, getPostAnalytics, getAccountAnalytics };
