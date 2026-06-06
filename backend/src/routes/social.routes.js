const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getAccounts, disconnectAccount, getConnectUrl } = require('../controllers/social.controller');

router.use(authenticate);

router.get('/', getAccounts);
router.get('/connect/:platform', getConnectUrl);
router.delete('/:id', disconnectAccount);

module.exports = router;
