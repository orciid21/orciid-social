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
