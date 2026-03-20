import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { authenticate } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/role.middleware';
import { sendSuccess } from '../utils/response.util';
import logger from '../utils/logger.util';

const router = Router();

// Configure multer for memory storage (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP, GIF, SVG) are allowed'));
    }
  },
});

// Helper: upload buffer to Cloudinary
function uploadToCloudinary(buffer: Buffer, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `amoha/${folder}`, resource_type: 'image', quality: 'auto', format: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result!.secure_url);
      },
    );
    stream.end(buffer);
  });
}

// Configure Cloudinary from env
const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    return true;
  }
  return false;
};

// POST /api/upload — single image upload
router.post('/', authenticate, isAdmin, upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No image file provided' });
      return;
    }

    const folder = (req.body.folder as string) || 'general';

    // Try Cloudinary first
    if (configureCloudinary()) {
      const url = await uploadToCloudinary(req.file.buffer, folder);
      sendSuccess(res, { url }, 'Image uploaded');
      return;
    }

    // Fallback: convert to base64 data URL (works without cloud storage)
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
    logger.warn('Cloudinary not configured — returning base64 data URL');
    sendSuccess(res, { url: dataUrl }, 'Image uploaded (base64)');
  } catch (error) {
    next(error);
  }
});

// POST /api/upload/multiple — multiple image upload
router.post('/multiple', authenticate, isAdmin, upload.array('images', 10), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No image files provided' });
      return;
    }

    const folder = (req.body.folder as string) || 'general';
    const urls: string[] = [];

    if (configureCloudinary()) {
      for (const file of files) {
        const url = await uploadToCloudinary(file.buffer, folder);
        urls.push(url);
      }
    } else {
      logger.warn('Cloudinary not configured — returning base64 data URLs');
      for (const file of files) {
        const base64 = file.buffer.toString('base64');
        urls.push(`data:${file.mimetype};base64,${base64}`);
      }
    }

    sendSuccess(res, { urls }, `${urls.length} images uploaded`);
  } catch (error) {
    next(error);
  }
});

// POST /api/upload/kyc — KYC document upload (authenticated users)
router.post('/kyc', authenticate, upload.single('document'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No document file provided' });
      return;
    }

    if (configureCloudinary()) {
      const url = await uploadToCloudinary(req.file.buffer, 'kyc');
      sendSuccess(res, { url }, 'Document uploaded');
      return;
    }

    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
    sendSuccess(res, { url: dataUrl }, 'Document uploaded (base64)');
  } catch (error) {
    next(error);
  }
});

export default router;
