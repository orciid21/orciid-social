const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { subscription: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireSubscription = (plans = []) => {
  return (req, res, next) => {
    const sub = req.user?.subscription;
    if (!sub) {
      return res.status(403).json({ error: 'No active subscription' });
    }

    const isActive = ['ACTIVE', 'TRIALING'].includes(sub.status);
    if (!isActive) {
      return res.status(403).json({ error: 'Subscription expired or cancelled' });
    }

    if (plans.length > 0 && !plans.includes(sub.plan)) {
      return res.status(403).json({ error: 'Upgrade your plan to access this feature' });
    }

    next();
  };
};

// Gate for the two actions that cost us money to run: connecting a channel and
// creating a post. Signing up and looking around stays free; doing the work
// needs a paid plan.
//
// Deliberately stricter than requireSubscription above, which also lets
// TRIALING through: a trial is a look, not a licence. ADMINs are exempt so the
// team can always operate the product they're selling.
const PAID_STATUSES = ['ACTIVE'];

const requirePaid = (req, res, next) => {
  if (req.user?.role === 'ADMIN') return next();

  const sub = req.user?.subscription;
  const status = sub?.status;

  if (PAID_STATUSES.includes(status)) return next();

  const reason =
    status === 'PAST_DUE'
      ? 'Your last payment did not go through. Update your payment method to continue.'
      : status === 'CANCELED'
        ? 'Your subscription was cancelled. Choose a plan to continue.'
        : 'Choose a plan to connect channels and publish posts.';

  return res.status(402).json({
    error: reason,
    code: 'PAYMENT_REQUIRED',
    status: status || 'NONE',
  });
};

// Same rule, for flows that resolve the user themselves (OAuth callbacks) rather
// than going through the authenticate middleware.
const isPaidUser = (user) => user?.role === 'ADMIN' || PAID_STATUSES.includes(user?.subscription?.status);

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, requireSubscription, requirePaid, isPaidUser, requireAdmin };
