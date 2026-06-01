const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const {
  register, login, refreshToken, verifyEmail,
  forgotPassword, resetPassword, getMe,
} = require('../controllers/auth.controller');

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], validate, register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, login);

router.post('/refresh', refreshToken);
router.get('/verify/:token', verifyEmail);
router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], validate, forgotPassword);
router.post('/reset-password/:token', [
  body('password').isLength({ min: 8 }),
], validate, resetPassword);
router.get('/me', authenticate, getMe);

module.exports = router;
