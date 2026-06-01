const prisma = require('../config/prisma');
const { AppError } = require('../middleware/error.middleware');

// GET /api/admin/stats
const getStats = async (req, res, next) => {
  try {
    const [totalUsers, planCounts, recentUsers, totalPosts] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.groupBy({
        by: ['plan', 'status'],
        _count: { id: true },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, createdAt: true, subscription: { select: { plan: true, status: true } } },
      }),
      prisma.post.count(),
    ]);

    // Build plan summary
    const planSummary = { FREE: 0, STARTER: 0, PRO: 0, AGENCY: 0 };
    const statusSummary = { ACTIVE: 0, TRIALING: 0, PAST_DUE: 0, CANCELED: 0 };
    for (const row of planCounts) {
      planSummary[row.plan] = (planSummary[row.plan] || 0) + row._count.id;
      statusSummary[row.status] = (statusSummary[row.status] || 0) + row._count.id;
    }

    res.json({
      totalUsers,
      totalPosts,
      planSummary,
      statusSummary,
      recentUsers,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users?page=1&limit=20&search=
const getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const search = req.query.search?.trim() || '';
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isVerified: true,
          createdAt: true,
          subscription: {
            select: { plan: true, status: true, trialEndsAt: true, currentPeriodEnd: true },
          },
          _count: { select: { posts: true, socialAccounts: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, plan, status } = req.body;

    // Prevent admin from demoting themselves
    if (id === req.user.id && role && role !== 'ADMIN') {
      throw new AppError('You cannot remove your own admin role', 400);
    }

    const updates = {};
    if (role) updates.role = role;

    const user = await prisma.user.update({
      where: { id },
      data: updates,
      select: { id: true, name: true, email: true, role: true },
    });

    // Update subscription plan/status if provided
    if (plan || status) {
      await prisma.subscription.upsert({
        where: { userId: id },
        create: { userId: id, plan: plan || 'FREE', status: status || 'ACTIVE' },
        update: { ...(plan && { plan }), ...(status && { status }) },
      });
    }

    res.json({ message: 'User updated', user });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      throw new AppError('You cannot delete your own account from admin panel', 400);
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getUsers, updateUser, deleteUser };
