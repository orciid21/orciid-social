const prisma = require('../config/prisma');
const { AppError } = require('../middleware/error.middleware');
const schedulerService = require('../services/scheduler.service');

// Fields of SocialAccount that are safe to send to the browser. Never include
// accessToken/refreshToken — Page tokens must stay server-side only.
const SAFE_SOCIAL_ACCOUNT_SELECT = {
  id: true,
  platform: true,
  platformId: true,
  name: true,
  username: true,
  avatar: true,
  isActive: true,
};

// The user's primary workspace + their role in it. OWNER sorts first (MySQL
// enum order OWNER<ADMIN<MEMBER), so an owner of any workspace is treated as the
// owner. Used for the approval flow + team-scoped post visibility.
const getMyWorkspace = async (userId) => {
  const m = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });
  return { workspaceId: m?.workspaceId || null, role: m?.role || 'OWNER' };
};

const createPost = async (req, res, next) => {
  try {
    const { content, mediaUrls = [], accountIds, scheduledAt } = req.body;
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

    // Team approval: posts from a MEMBER need an owner/admin to approve before
    // they go live, so they're parked as PENDING_APPROVAL (and never scheduled
    // until approved). Owners/admins post directly.
    const { workspaceId, role } = await getMyWorkspace(userId);
    const needsApproval = role === 'MEMBER';
    const status = needsApproval ? 'PENDING_APPROVAL' : (scheduledAt ? 'SCHEDULED' : 'DRAFT');

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
        accounts: { include: { socialAccount: { select: SAFE_SOCIAL_ACCOUNT_SELECT } } },
      },
    });

    if (status === 'SCHEDULED' && scheduledAt) {
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

    // Team-scoped: a user sees their own posts AND everything in their workspace
    // (so owners/admins can review members' PENDING_APPROVAL posts, and the team
    // shares one queue). Solo users just see their own.
    const { workspaceId } = await getMyWorkspace(userId);
    const where = {
      ...(status && { status }),
      ...(from && to && { scheduledAt: { gte: new Date(from), lte: new Date(to) } }),
      OR: [{ userId }, ...(workspaceId ? [{ workspaceId }] : [])],
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: { accounts: { include: { socialAccount: { select: SAFE_SOCIAL_ACCOUNT_SELECT } } }, analytics: true },
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
      include: { accounts: { include: { socialAccount: { select: SAFE_SOCIAL_ACCOUNT_SELECT } } }, analytics: true },
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
      include: { accounts: { include: { socialAccount: { select: SAFE_SOCIAL_ACCOUNT_SELECT } } } },
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
      include: { accounts: { include: { socialAccount: { select: SAFE_SOCIAL_ACCOUNT_SELECT } } } },
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
      include: { accounts: { include: { socialAccount: { select: SAFE_SOCIAL_ACCOUNT_SELECT } } } },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json(posts);
  } catch (err) {
    next(err);
  }
};

// --- Approvals (team roles) ------------------------------------------------
// Only OWNER/ADMIN of the workspace may approve/reject, and only posts in their
// workspace that are PENDING_APPROVAL.
const loadPendingForReview = async (req) => {
  const { workspaceId, role } = await getMyWorkspace(req.user.id);
  if (role !== 'OWNER' && role !== 'ADMIN') {
    throw new AppError('Only owners and admins can review posts', 403);
  }
  const post = await prisma.post.findFirst({ where: { id: req.params.id, workspaceId } });
  if (!post) throw new AppError('Post not found', 404);
  if (post.status !== 'PENDING_APPROVAL') throw new AppError('This post is not awaiting approval', 400);
  return post;
};

// POST /api/posts/:id/approve — push the post live: schedule it if it has a
// future time, otherwise publish immediately.
const approvePost = async (req, res, next) => {
  try {
    const post = await loadPendingForReview(req);
    const future = post.scheduledAt && new Date(post.scheduledAt) > new Date();
    await prisma.post.update({ where: { id: post.id }, data: { status: 'SCHEDULED' } });
    await prisma.postAccount.updateMany({ where: { postId: post.id }, data: { status: 'SCHEDULED' } });
    if (future) {
      await schedulerService.schedulePost(post.id, new Date(post.scheduledAt));
      res.json({ message: 'Approved and scheduled' });
    } else {
      await schedulerService.publishPostNow(post.id);
      res.json({ message: 'Approved and publishing now' });
    }
  } catch (err) {
    next(err);
  }
};

// POST /api/posts/:id/reject — send it back to the author as a draft.
const rejectPost = async (req, res, next) => {
  try {
    const post = await loadPendingForReview(req);
    await prisma.post.update({ where: { id: post.id }, data: { status: 'DRAFT', scheduledAt: null } });
    await prisma.postAccount.updateMany({ where: { postId: post.id }, data: { status: 'DRAFT' } });
    res.json({ message: 'Post rejected and returned to drafts' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createPost, getPosts, getPost, updatePost, deletePost, publishNow, getCalendar, approvePost, rejectPost };
