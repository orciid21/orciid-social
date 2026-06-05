const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticate } = require('../middleware/auth.middleware');
const { AppError } = require('../middleware/error.middleware');

// Make sure the uploads folder exists (served statically at /uploads in app.js)
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

// Allow common image + video formats only
const ALLOWED = /^(image\/(jpeg|jpg|png|gif|webp)|video\/(mp4|quicktime|webm|x-m4v))$/;

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.test(file.mimetype)) return cb(null, true);
    cb(new AppError('Only images (jpg, png, gif, webp) and videos (mp4, mov, webm) are allowed', 400));
  },
});

// Run multer and translate its errors into clean 400 responses
const uploadSingle = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large. Maximum size is 10MB.', 400));
    }
    return next(err.statusCode ? err : new AppError(err.message || 'Upload failed', 400));
  });
};

router.use(authenticate);

// POST /api/uploads  (multipart/form-data, field name: "file")
router.post('/', uploadSingle, (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);
    const base = (process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    const url = `${base}/uploads/${req.file.filename}`;
    res.status(201).json({
      url,
      type: req.file.mimetype.startsWith('video/') ? 'video' : 'image',
      size: req.file.size,
      name: req.file.originalname,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
