const prisma = require('../config/prisma');

// Gmail (and googlemail) ignore dots in the local part, so an invite sent to
// omar.awdia@gmail.com and an account registered as omarawdia@gmail.com are the
// same mailbox and the same person. Every place that matches an invited address
// against a user must compare this normalised form on BOTH sides — comparing one
// raw address to one normalised address silently fails for exactly the case it
// was written to handle.
const normaliseEmail = (addr) => {
  const raw = String(addr || '').trim().toLowerCase();
  const [local, domain] = raw.split('@');
  if (!domain) return raw;
  const bare = ['gmail.com', 'googlemail.com'].includes(domain)
    ? local.replace(/\./g, '')
    : local;
  return `${bare}@${domain}`;
};

// Which workspace counts as "this user's" workspace?
//
// The old rule was "order by role, OWNER first", repeated in six files. It is
// wrong for anyone who was invited: registration gives EVERY new account its own
// workspace as OWNER, so an invited teammate has two memberships — OWNER of their
// own empty workspace, MEMBER of the team they were invited to — and the OWNER
// row always won. That is precisely why an invited member logged in to what
// looked like a brand new account: they were being shown their own empty
// workspace, not the one they had been invited to.
//
// Prefer the workspace that actually has channels connected: that is the team
// someone was invited to work in. Role and age remain the tie-break, so a genuine
// solo account with nothing connected anywhere still lands in its own workspace.
const pickPrimaryMembership = async (userId) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    include: { workspace: { include: { _count: { select: { accounts: true } } } } },
  });
  if (memberships.length === 0) return null;
  // Array.prototype.sort is stable, so equal channel counts keep the
  // OWNER-then-oldest order the query already applied.
  return memberships
    .slice()
    .sort((a, b) => (b.workspace._count.accounts || 0) - (a.workspace._count.accounts || 0))[0];
};

const primaryWorkspaceId = async (userId) => {
  const m = await pickPrimaryMembership(userId);
  return m?.workspaceId || null;
};

module.exports = { normaliseEmail, pickPrimaryMembership, primaryWorkspaceId };
