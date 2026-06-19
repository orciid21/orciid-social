const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/error.middleware');
const emailService = require('../services/email.service');

router.use(authenticate);

// --- helpers ---------------------------------------------------------------

// Every user has a "primary" workspace = their team/org. It's created at
// register time (OWNER), but older accounts or edge cases may lack one, so
// get-or-create defensively.
const getPrimaryWorkspace = async (userId, userName) => {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }], // OWNER sorts before others
    include: { workspace: true },
  });
  if (membership) return { workspace: membership.workspace, role: membership.role };

  const slug = `${(userName || 'team').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
  const workspace = await prisma.workspace.create({
    data: {
      name: `${userName || 'My'} Workspace`,
      slug,
      members: { create: { userId, role: 'OWNER' } },
    },
  });
  return { workspace, role: 'OWNER' };
};

const serializeMember = (m) => ({
  id: m.user.id,
  name: m.user.name,
  email: m.user.email,
  avatar: m.user.avatar,
  role: m.role,
  joinedAt: m.createdAt,
});

const teamPayload = async (workspaceId, currentRole, currentUserId) => {
  const [workspace, members, invitations] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId } }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.invitation.findMany({
      where: { workspaceId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return {
    workspace: { id: workspace.id, name: workspace.name, logo: workspace.logo },
    currentRole,
    currentUserId,
    members: members.map(serializeMember),
    invitations: invitations.map((i) => ({ id: i.id, email: i.email, role: i.role, token: i.token, createdAt: i.createdAt })),
  };
};

const canManage = (role) => role === 'OWNER' || role === 'ADMIN';

// --- team (primary workspace) ----------------------------------------------

// GET /api/workspaces/team — the user's team: workspace + members + pending invites
router.get('/team', async (req, res, next) => {
  try {
    const { workspace, role } = await getPrimaryWorkspace(req.user.id, req.user.name);
    res.json(await teamPayload(workspace.id, role, req.user.id));
  } catch (err) { next(err); }
});

// PATCH /api/workspaces/team — rename the workspace (OWNER/ADMIN)
router.patch('/team', async (req, res, next) => {
  try {
    const { workspace, role } = await getPrimaryWorkspace(req.user.id, req.user.name);
    if (!canManage(role)) throw new AppError('Only owners and admins can edit the workspace', 403);
    const name = String(req.body.name || '').trim();
    if (!name) throw new AppError('Workspace name is required', 400);
    await prisma.workspace.update({ where: { id: workspace.id }, data: { name } });
    res.json(await teamPayload(workspace.id, role, req.user.id));
  } catch (err) { next(err); }
});

// POST /api/workspaces/team/invite  { email, role } — invite a member (OWNER/ADMIN)
router.post('/team/invite', async (req, res, next) => {
  try {
    const { workspace, role } = await getPrimaryWorkspace(req.user.id, req.user.name);
    if (!canManage(role)) throw new AppError('Only owners and admins can invite members', 403);

    const email = String(req.body.email || '').trim().toLowerCase();
    const inviteRole = ['ADMIN', 'MEMBER'].includes(req.body.role) ? req.body.role : 'MEMBER';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('Enter a valid email address', 400);

    // Already a registered user? Add them straight to the workspace.
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const already = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: existing.id, workspaceId: workspace.id } },
      });
      if (already) throw new AppError('That person is already a member', 400);
      await prisma.workspaceMember.create({
        data: { userId: existing.id, workspaceId: workspace.id, role: inviteRole },
      });
    } else {
      // Not registered yet — keep a pending invite, converted on sign-up.
      await prisma.invitation.upsert({
        where: { workspaceId_email: { workspaceId: workspace.id, email } },
        update: { role: inviteRole, status: 'PENDING', invitedBy: req.user.id },
        create: { workspaceId: workspace.id, email, role: inviteRole, invitedBy: req.user.id },
      });
    }

    // Notify the invitee by email (non-fatal — needs SMTP_* env configured).
    try {
      await emailService.sendInvitationEmail(email, req.user.name, workspace.name, inviteRole);
    } catch (mailErr) {
      console.warn('Invitation email failed (SMTP not configured?):', mailErr.message);
    }

    res.status(201).json(await teamPayload(workspace.id, role, req.user.id));
  } catch (err) { next(err); }
});

// PATCH /api/workspaces/team/members/:userId  { role } — change a member's role
router.patch('/team/members/:userId', async (req, res, next) => {
  try {
    const { workspace, role } = await getPrimaryWorkspace(req.user.id, req.user.name);
    if (!canManage(role)) throw new AppError('Only owners and admins can change roles', 403);

    const target = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.params.userId, workspaceId: workspace.id } },
    });
    if (!target) throw new AppError('Member not found', 404);
    if (target.role === 'OWNER') throw new AppError("The owner's role can't be changed", 400);

    const newRole = ['ADMIN', 'MEMBER'].includes(req.body.role) ? req.body.role : null;
    if (!newRole) throw new AppError('Invalid role', 400);

    await prisma.workspaceMember.update({
      where: { userId_workspaceId: { userId: req.params.userId, workspaceId: workspace.id } },
      data: { role: newRole },
    });
    res.json(await teamPayload(workspace.id, role, req.user.id));
  } catch (err) { next(err); }
});

// DELETE /api/workspaces/team/members/:userId — remove a member
router.delete('/team/members/:userId', async (req, res, next) => {
  try {
    const { workspace, role } = await getPrimaryWorkspace(req.user.id, req.user.name);
    if (!canManage(role)) throw new AppError('Only owners and admins can remove members', 403);

    const target = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.params.userId, workspaceId: workspace.id } },
    });
    if (!target) throw new AppError('Member not found', 404);
    if (target.role === 'OWNER') throw new AppError("The owner can't be removed", 400);

    await prisma.workspaceMember.delete({
      where: { userId_workspaceId: { userId: req.params.userId, workspaceId: workspace.id } },
    });
    res.json(await teamPayload(workspace.id, role, req.user.id));
  } catch (err) { next(err); }
});

// DELETE /api/workspaces/team/invites/:id — cancel a pending invitation
router.delete('/team/invites/:id', async (req, res, next) => {
  try {
    const { workspace, role } = await getPrimaryWorkspace(req.user.id, req.user.name);
    if (!canManage(role)) throw new AppError('Only owners and admins can manage invites', 403);
    await prisma.invitation.deleteMany({ where: { id: req.params.id, workspaceId: workspace.id } });
    res.json(await teamPayload(workspace.id, role, req.user.id));
  } catch (err) { next(err); }
});

// --- legacy multi-workspace endpoints (kept) -------------------------------

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
