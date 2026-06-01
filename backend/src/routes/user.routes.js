const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

router.use(authenticate);

router.patch('/profile', async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { ...(name && { name }), ...(avatar && { avatar }) },
      select: { id: true, name: true, email: true, avatar: true, role: true },
    });
    res.json(user);
  } catch (err) { next(err); }
});

router.patch('/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
    res.json({ message: 'Password updated' });
  } catch (err) { next(err); }
});

module.exports = router;
