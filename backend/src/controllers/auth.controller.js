const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/error.middleware');
const emailService = require('../services/email.service');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { accessToken, refreshToken };
};

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already in use', 409);

    const hashedPassword = await bcrypt.hash(password, 12);
    const verifyToken = uuidv4();

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        verifyToken,
        subscription: {
          create: {
            plan: 'FREE',
            status: 'TRIALING',
            trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        },
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    // Create default workspace
    await prisma.workspace.create({
      data: {
        name: `${name}'s Workspace`,
        slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        members: {
          create: { userId: user.id, role: 'OWNER' },
        },
      },
    });

    await emailService.sendVerificationEmail(email, name, verifyToken);

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.status(201).json({
      message: 'Account created successfully. Please check your email to verify.',
      user,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscription: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError('Invalid email or password', 401);
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    const { password: _, verifyToken: __, resetToken: ___, ...safeUser } = user;

    res.json({ user: safeUser, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) throw new AppError('Refresh token required', 400);

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) throw new AppError('User not found', 401);

    const tokens = generateTokens(user.id);
    res.json(tokens);
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('Invalid refresh token', 401));
    }
    next(err);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const user = await prisma.user.findFirst({ where: { verifyToken: token } });
    if (!user) throw new AppError('Invalid verification token', 400);

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verifyToken: null },
    });

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond ok to prevent email enumeration
    if (!user) return res.json({ message: 'If the email exists, a reset link has been sent.' });

    const resetToken = uuidv4();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExp: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    await emailService.sendPasswordResetEmail(email, user.name, resetToken);
    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExp: { gt: new Date() } },
    });
    if (!user) throw new AppError('Invalid or expired reset token', 400);

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetToken: null, resetTokenExp: null },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res) => {
  const { password, verifyToken, resetToken, resetTokenExp, ...safeUser } = req.user;
  res.json(safeUser);
};

module.exports = { register, login, refreshToken, verifyEmail, forgotPassword, resetPassword, getMe };
