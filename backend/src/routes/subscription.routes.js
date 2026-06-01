const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  getSubscription, createCheckoutSession,
  createPortalSession, handleWebhook,
} = require('../controllers/subscription.controller');

// Webhook must come before JSON middleware (raw body needed)
router.post('/webhook', handleWebhook);

router.use(authenticate);
router.get('/', getSubscription);
router.post('/checkout', createCheckoutSession);
router.post('/portal', createPortalSession);

module.exports = router;
