import { Router } from 'express';
import settingsController from '../controllers/settings.controller';

const router = Router();

// Public: get site settings (no auth required)
router.get('/', settingsController.get);

export default router;
