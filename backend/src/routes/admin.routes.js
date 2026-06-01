const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { getStats, getUsers, updateUser, deleteUser } = require('../controllers/admin.controller');

const router = express.Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, requireAdmin);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
