const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  createPost, getPosts, getPost, updatePost,
  deletePost, publishNow, getCalendar, approvePost, rejectPost,
} = require('../controllers/post.controller');

router.use(authenticate);

router.get('/calendar', getCalendar);
router.get('/', getPosts);
router.post('/', createPost);
router.get('/:id', getPost);
router.patch('/:id', updatePost);
router.delete('/:id', deletePost);
router.post('/:id/publish', publishNow);
router.post('/:id/approve', approvePost);
router.post('/:id/reject', rejectPost);

module.exports = router;
