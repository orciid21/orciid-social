const prisma = require('../config/prisma');
const { AppError } = require('../middleware/error.middleware');
const schedulerService = require('../services/scheduler.service');

const createPost = async (req, res, next) => {
  try {
    const { content, mediaUrls = [], accountIds, scheduledAt, workspaceId } = req.body;
    const userId = req.user.id;

    if (!accountIds || accountIds.length === 0) {
      throw new AppError('Select at least one social account', 400);
    }

    // Verify accounts belong to user
    const accounts = await prisma.socialAccount.findMany({
      where: { id: { in: accountIds }, userId, isActive: true },
    });

    if (accounts.length !== accountIds.length) {
      throw new AppError('One or more accounts are invalid', 400);
    }

    const status = scheduledAt ? 'SCHEDULED' : 'DRAFT';

    const post = await prisma.post.create({
      data: {
        userId,
        workspaceId,
        content,
        mediaUrls,
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        accounts: {
          create: accounts.map((acc) => ({
            socialAccountId: acc.id,
            status,
          })),
        },
      },
      include: {
        accounts: { include: { socialAccount: true } },
      },
    });

    if (scheduledAt) {
      await schedulerService.schedulePost(post.id, new Date(scheduledAt));
    }

    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
};

const getPosts = async (req, res, next) => {
  try {
    const { status, from, to, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    const where = {
      userId,
      ...(status && { status }),
      ...(from && to && { scheduledAt: { gte: new Date(from), lte: new Date(to) } }),
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: { accounts: { include: { socialAccount: true } }, analytics: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: Number(limit),
      }),
      prisma.post.count({ where }),
    ]);

    res.json({ posts, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

const getPost = async (req, res, next) => {
  try {
    const post = await prisma.post.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { accounts: { include: { socialAccount: true } }, analytics: true },
    });
    if (!post) throw new AppError('Post not found', 404);
    res.json(post);
  } catch (err) {
    next(err);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const { content, mediaUrls, scheduledAt, accountIds } = req.body;
    const post = await prisma.post.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!post) throw new AppError('Post not found', 404);
    if (post.status === 'PUBLISHED') throw new AppError('Cannot edit published posts', 400);

    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      data: {
        ...(content !== undefined && { content }),
        ...(mediaUrls !== undefined && { mediaUrls }),
        ...(scheduledAt !== undefined && { scheduledAt: new Date(scheduledAt), status: 'SCHEDULED' }),
      },
      include: { accounts: { include: { socialAccount: true } } },
    });

    if (scheduledAt) {
      await schedulerService.reschedulePost(post.id, new Date(scheduledAt));
    }

    res.json(updatedPost);
  } catch (err) {
    next(err);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const post = await prisma.post.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!post) throw new AppError('Post not found', 404);
    if (post.status === 'PUBLISHED') throw new AppError('Cannot delete published posts', 400);

    await schedulerService.cancelPost(post.id);
    await prisma.post.delete({ where: { id: post.id } });

    res.json({ message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
};

const publishNow = async (req, res, next) => {
  try {
    const post = await prisma.post.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { accounts: { include: { socialAccount: true } } },
    });
    if (!post) throw new AppError('Post not found', 404);
    if (post.status === 'PUBLISHED') throw new AppError('Already published', 400);

    await schedulerService.publishPostNow(post.id);
    res.json({ message: 'Post queued for immediate publishing' });
  } catch (err) {
    next(err);
  }
};

const getCalendar = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const posts = await prisma.post.findMany({
      where: {
        userId: req.user.id,
        scheduledAt: { gte: start, lte: end },
      },
      include: { accounts: { include: { socialAccount: true } } },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json(posts);
  } catch (err) {
    next(err);
  }
};

module.exports = { createPost, getPosts, getPost, updatePost, deletePost, publishNow, getCalendar };
