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

// Map an allowed mime type to a file extension. Used by the base64 path, where
// the original filename can't be trusted to derive a safe extension.
const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'video/x-m4v': '.m4v',
};

const MAX_BYTES = Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;

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

// Build the public URL + response payload for a stored file.
const fileResponse = (req, { filename, mime, size, name }) => {
  const base = (process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  return {
    url: `${base}/uploads/${filename}`,
    type: mime.startsWith('video/') ? 'video' : 'image',
    size,
    name: name || filename,
  };
};

// Classic multipart/form-data response (field name: "file").
const multipartHandler = (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);
    res.status(201).json(
      fileResponse(req, {
        filename: req.file.filename,
        mime: req.file.mimetype,
        size: req.file.size,
        name: req.file.originalname,
      })
    );
  } catch (err) {
    next(err);
  }
};

// JSON body  { dataBase64, contentType, name }  →  writes the decoded file.
//
// Why this path exists: Hostinger's CDN (hcdn) in front of production returns
// "405 Not Allowed" (HTML) for binary multipart/form-data image uploads above
// ~32KB, which the UI surfaces as the generic "Failed to upload media". A JSON
// body with the file as a base64 string passes the CDN untouched, so the
// browser sends images this way and we decode them back to bytes here.
const handleBase64 = (req, res, next) => {
  try {
    const { dataBase64, contentType, name } = req.body || {};
    if (!dataBase64 || typeof dataBase64 !== 'string') {
      throw new AppError('No file data provided', 400);
    }

    // Accept either a raw base64 string or a full data URL. When it's a data URL
    // its embedded mime is authoritative (the browser canvas may have re-encoded,
    // e.g. webp → jpeg); contentType is only a fallback for raw base64.
    let mime = contentType;
    let b64 = dataBase64;
    const dataUrl = /^data:([^;]+);base64,(.*)$/s.exec(dataBase64);
    if (dataUrl) {
      mime = dataUrl[1] || mime;
      b64 = dataUrl[2];
    }

    if (!mime || !ALLOWED.test(mime)) {
      throw new AppError('Only images (jpg, png, gif, webp) and videos (mp4, mov, webm) are allowed', 400);
    }

    const buffer = Buffer.from(b64, 'base64');
    if (!buffer.length) throw new AppError('Invalid file data', 400);
    if (buffer.length > MAX_BYTES) {
      throw new AppError('File too large. Maximum size is 10MB.', 400);
    }

    const ext = MIME_EXT[mime] || '';
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

    res.status(201).json(fileResponse(req, { filename, mime, size: buffer.length, name }));
  } catch (err) {
    next(err);
  }
};

router.use(authenticate);

// POST /api/uploads
// - JSON body            → base64 path (bypasses the Hostinger CDN 405 block)
// - multipart/form-data  → classic multer path (works locally / direct to Node)
router.post('/', (req, res, next) => {
  if (req.is('application/json')) return handleBase64(req, res, next);
  return uploadSingle(req, res, (err) => (err ? next(err) : multipartHandler(req, res, next)));
});

module.exports = router;
