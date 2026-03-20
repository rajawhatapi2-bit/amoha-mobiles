import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import productRoutes from './product.routes';
import categoryRoutes from './category.routes';
import brandRoutes from './brand.routes';
import cartRoutes from './cart.routes';
import orderRoutes from './order.routes';
import wishlistRoutes from './wishlist.routes';
import bannerRoutes from './banner.routes';
import couponRoutes from './coupon.routes';
import adminRoutes from './admin.routes';
import serviceRequestRoutes from './service-request.routes';
import contactRoutes from './contact.routes';
import paymentRoutes from './payment.routes';
import settingsRoutes from './settings.routes';
import uploadRoutes from './upload.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/banners', bannerRoutes);
router.use('/coupons', couponRoutes);
router.use('/admin', adminRoutes);
router.use('/service-requests', serviceRequestRoutes);
router.use('/contact', contactRoutes);
router.use('/payment', paymentRoutes);
router.use('/settings', settingsRoutes);
router.use('/upload', uploadRoutes);

export default router;
