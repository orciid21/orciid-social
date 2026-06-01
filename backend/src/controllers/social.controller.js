const prisma = require('../config/prisma');
const { AppError } = require('../middleware/error.middleware');

const getAccounts = async (req, res, next) => {
  try {
    const accounts = await prisma.socialAccount.findMany({
      where: { userId: req.user.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(accounts);
  } catch (err) {
    next(err);
  }
};

const disconnectAccount = async (req, res, next) => {
  try {
    const account = await prisma.socialAccount.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!account) throw new AppError('Account not found', 404);

    await prisma.socialAccount.update({
      where: { id: account.id },
      data: { isActive: false },
    });

    res.json({ message: 'Account disconnected' });
  } catch (err) {
    next(err);
  }
};

const getConnectUrl = (req, res) => {
  const { platform } = req.params;
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://api.orciid.online'
    : `http://localhost:${process.env.PORT || 5000}`;

  const urls = {
    FACEBOOK: `${baseUrl}/auth/facebook?token=${req.headers.authorization?.split(' ')[1]}`,
    TWITTER: `${baseUrl}/auth/twitter?token=${req.headers.authorization?.split(' ')[1]}`,
    LINKEDIN: `${baseUrl}/auth/linkedin?token=${req.headers.authorization?.split(' ')[1]}`,
    TIKTOK: `${baseUrl}/auth/tiktok?token=${req.headers.authorization?.split(' ')[1]}`,
    INSTAGRAM: `${baseUrl}/auth/instagram?token=${req.headers.authorization?.split(' ')[1]}`,
  };

  const url = urls[platform.toUpperCase()];
  if (!url) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }

  res.json({ url });
};

module.exports = { getAccounts, disconnectAccount, getConnectUrl };
