const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const workspaces = await prisma.workspaceMember.findMany({
      where: { userId: req.user.id },
      include: { workspace: { include: { members: { include: { user: { select: { id: true, name: true, avatar: true } } } } } } },
    });
    res.json(workspaces.map((m) => m.workspace));
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        members: { create: { userId: req.user.id, role: 'OWNER' } },
      },
    });
    res.status(201).json(workspace);
  } catch (err) { next(err); }
});

module.exports = router;
