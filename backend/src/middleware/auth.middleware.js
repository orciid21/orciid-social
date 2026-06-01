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

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, requireSubscription, requireAdmin };
