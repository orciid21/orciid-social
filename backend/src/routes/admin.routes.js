const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { getStats, getUsers, updateUser, deleteUser, getEmailStatus, sendTestEmail } = require('../controllers/admin.controller');

const router = express.Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, requireAdmin);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Email / SMTP diagnostics
router.get('/email-status', getEmailStatus);
router.post('/test-email', sendTestEmail);

module.exports = router;
