const express = require('express');
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate);

// Projects live in a workspace. Every member of the workspace sees them, so the
// team is invited once rather than per client.
const getMyWorkspaceId = async (userId) => {
  const m = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });
  return m?.workspaceId || null;
};

const CHANNEL_FIELDS = {
  id: true,
  platform: true,
  platformId: true,
  name: true,
  username: true,
  avatar: true,
  isActive: true,
};

// GET /api/projects — projects plus their channels, and whatever is unassigned.
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const workspaceId = await getMyWorkspaceId(userId);

    const projects = workspaceId
      ? await prisma.project.findMany({
          where: { workspaceId },
          orderBy: { createdAt: 'asc' },
          include: {
            accounts: {
              where: { isActive: true },
              select: CHANNEL_FIELDS,
              orderBy: { createdAt: 'asc' },
            },
          },
        })
      : [];

    const unassigned = await prisma.socialAccount.findMany({
      where: { userId, isActive: true, projectId: null },
      select: CHANNEL_FIELDS,
      orderBy: { createdAt: 'asc' },
    });

    res.json({ projects, unassigned });
  } catch (err) {
    next(err);
  }
});


// A post counts towards a project when any of its channels belongs to it.
const postsInProject = (userId, projectId) => ({
  userId,
  accounts: { some: { socialAccount: { projectId } } },
});

const sumEngagement = (agg) => {
  const s = agg._sum || {};
  return {
    likes: s.likes || 0,
    comments: s.comments || 0,
    shares: s.shares || 0,
    reach: s.reach || 0,
    impressions: s.impressions || 0,
    total: (s.likes || 0) + (s.comments || 0) + (s.shares || 0),
  };
};

// GET /api/projects/summary — one row per project for the main dashboard:
// how many channels, how much has been posted, how much it earned back.
router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const workspaceId = await getMyWorkspaceId(userId);
    const days = Number(req.query.days) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const projects = workspaceId
      ? await prisma.project.findMany({
          where: { workspaceId },
          orderBy: { createdAt: 'asc' },
          include: { accounts: { where: { isActive: true }, select: { id: true, platform: true } } },
        })
      : [];

    const rows = await Promise.all(
      projects.map(async (project) => {
        const where = postsInProject(userId, project.id);
        const [totalPosts, scheduled, published, engagement] = await Promise.all([
          prisma.post.count({ where }),
          prisma.post.count({ where: { ...where, status: 'SCHEDULED' } }),
          prisma.post.count({ where: { ...where, status: 'PUBLISHED' } }),
          prisma.postAnalytics.aggregate({
            where: { post: where, fetchedAt: { gte: since } },
            _sum: { likes: true, comments: true, shares: true, reach: true, impressions: true },
          }),
        ]);
        return {
          id: project.id,
          name: project.name,
          color: project.color,
          channelCount: project.accounts.length,
          platforms: [...new Set(project.accounts.map((a) => a.platform))],
          totalPosts,
          scheduled,
          published,
          engagement: sumEngagement(engagement),
        };
      })
    );

    const unassignedCount = await prisma.socialAccount.count({
      where: { userId, isActive: true, projectId: null },
    });

    res.json({ projects: rows, unassignedChannels: unassignedCount });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id/overview — everything one project's own dashboard needs.
router.get('/:id/overview', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const workspaceId = await getMyWorkspaceId(userId);
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, workspaceId },
      include: {
        accounts: { where: { isActive: true }, select: CHANNEL_FIELDS, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const days = Number(req.query.days) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const where = postsInProject(userId, project.id);
    const withChannels = { accounts: { include: { socialAccount: { select: CHANNEL_FIELDS } } } };

    const [totalPosts, scheduled, published, drafts, engagement, recent, upcoming] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.count({ where: { ...where, status: 'SCHEDULED' } }),
      prisma.post.count({ where: { ...where, status: 'PUBLISHED' } }),
      prisma.post.count({ where: { ...where, status: 'DRAFT' } }),
      prisma.postAnalytics.aggregate({
        where: { post: where, fetchedAt: { gte: since } },
        _sum: { likes: true, comments: true, shares: true, reach: true, impressions: true },
      }),
      prisma.post.findMany({ where, orderBy: { createdAt: 'desc' }, take: 5, include: withChannels }),
      prisma.post.findMany({
        where: { ...where, status: 'SCHEDULED', scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        include: withChannels,
      }),
    ]);

    res.json({
      project: { id: project.id, name: project.name, color: project.color },
      channels: project.accounts,
      stats: { totalPosts, scheduled, published, drafts, channels: project.accounts.length },
      engagement: sumEngagement(engagement),
      recentPosts: recent,
      upcomingPosts: upcoming,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects — create one.
router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const color = req.body.color ? String(req.body.color) : null;
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    const workspaceId = await getMyWorkspaceId(req.user.id);
    if (!workspaceId) return res.status(400).json({ error: 'No workspace found for this account' });

    const existing = await prisma.project.findFirst({ where: { workspaceId, name } });
    if (existing) return res.status(409).json({ error: 'A project with that name already exists' });

    const project = await prisma.project.create({ data: { workspaceId, name, color } });
    res.status(201).json({ ...project, accounts: [] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/projects/:id — rename or recolour.
router.patch('/:id', async (req, res, next) => {
  try {
    const workspaceId = await getMyWorkspaceId(req.user.id);
    const project = await prisma.project.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const data = {};
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: 'Project name is required' });
      data.name = name;
    }
    if (req.body.color !== undefined) data.color = req.body.color || null;

    const updated = await prisma.project.update({ where: { id: project.id }, data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id — the project goes, its channels stay (unassigned).
router.delete('/:id', async (req, res, next) => {
  try {
    const workspaceId = await getMyWorkspaceId(req.user.id);
    const project = await prisma.project.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    await prisma.socialAccount.updateMany({ where: { projectId: project.id }, data: { projectId: null } });
    await prisma.project.delete({ where: { id: project.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/channels/:accountId — move a channel into a project, or out
// of every project when projectId is null.
router.put('/channels/:accountId', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const account = await prisma.socialAccount.findFirst({
      where: { id: req.params.accountId, userId },
    });
    if (!account) return res.status(404).json({ error: 'Channel not found' });

    const { projectId } = req.body;
    if (projectId) {
      const workspaceId = await getMyWorkspaceId(userId);
      const project = await prisma.project.findFirst({ where: { id: projectId, workspaceId } });
      if (!project) return res.status(404).json({ error: 'Project not found' });
    }

    const updated = await prisma.socialAccount.update({
      where: { id: account.id },
      data: { projectId: projectId || null },
      select: { ...CHANNEL_FIELDS, projectId: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
