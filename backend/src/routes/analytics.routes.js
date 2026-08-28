const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getOverview, getPostAnalytics, getAccountAnalytics, getInsights, getSeries } = require('../controllers/analytics.controller');

router.use(authenticate);

router.get('/overview', getOverview);
router.get('/insights', getInsights);
router.get('/series', getSeries);
router.get('/accounts', getAccountAnalytics);
router.get('/posts/:postId', getPostAnalytics);

module.exports = router;
