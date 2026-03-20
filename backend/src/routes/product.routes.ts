import { Router } from 'express';
import productController from '../controllers/product.controller';
import productViewController from '../controllers/product-view.controller';
import { authenticate } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createProductSchema, updateProductSchema, reviewSchema } from '../validators/product.validator';

const router = Router();

// Public routes - order matters: specific routes before parameterized ones
router.get('/featured', productController.getFeatured);
router.get('/trending', productController.getTrending);
router.get('/search/suggestions', productController.searchSuggestions);
router.get('/category/:categorySlug', productController.getByCategory);
router.get('/:id/related', productController.getRelated);
router.get('/:slug', productController.getBySlug);
router.get('/', productController.getAll);

// Protected routes
router.post('/track-view', authenticate, productViewController.track);
router.post('/:id/reviews', authenticate, validate(reviewSchema), productController.addReview);
router.delete('/:id/reviews/:reviewId', authenticate, productController.deleteReview);

// Admin routes
router.post('/', authenticate, isAdmin, validate(createProductSchema), productController.create);
router.put('/:id', authenticate, isAdmin, validate(updateProductSchema), productController.update);
router.delete('/:id', authenticate, isAdmin, productController.delete);
router.patch('/:id/stock', authenticate, isAdmin, productController.updateStock);

export default router;
