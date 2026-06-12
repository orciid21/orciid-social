const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  getAccounts,
  disconnectAccount,
  getConnectUrl,
  getFacebookPages,
  connectFacebookPages,
  debugFacebook,
} = require('../controllers/social.controller');

router.use(authenticate);

router.get('/', getAccounts);
router.get('/facebook/debug', debugFacebook);
router.get('/facebook/pages', getFacebookPages);
router.post('/facebook/pages/connect', connectFacebookPages);
router.get('/connect/:platform', getConnectUrl);
router.delete('/:id', disconnectAccount);

module.exports = router;
