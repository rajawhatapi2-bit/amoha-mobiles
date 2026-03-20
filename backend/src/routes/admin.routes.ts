import { Router, Request, Response, NextFunction } from 'express';
import adminController from '../controllers/admin.controller';
import productController from '../controllers/product.controller';
import categoryController from '../controllers/category.controller';
import brandController from '../controllers/brand.controller';
import orderController from '../controllers/order.controller';
import userController from '../controllers/user.controller';
import bannerController from '../controllers/banner.controller';
import serviceRequestController from '../controllers/service-request.controller';
import contactController from '../controllers/contact.controller';
import settingsController from '../controllers/settings.controller';
import notificationController from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';
import { updateOrderStatusSchema } from '../validators/order.validator';
import couponService from '../services/coupon.service';
import productService from '../services/product.service';
import productViewController from '../controllers/product-view.controller';
import barcodeController from '../controllers/barcode.controller';
import crmController from '../controllers/crm.controller';
import { sendSuccess, sendCreated, sendMessage } from '../utils/response.util';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, isAdmin);

// ====== Dashboard ======
router.get('/dashboard/stats', adminController.getDashboard);
router.get('/dashboard/revenue', adminController.getMonthlyRevenue);
router.get('/dashboard/top-products', adminController.getTopProducts);
router.get('/dashboard/recent-orders', adminController.getRecentOrders);
router.get('/sales-report', adminController.getSalesReport);

// ====== Report Downloads ======
router.get('/reports/sales', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month, year } = req.query;
    const targetYear = parseInt(year as string) || new Date().getFullYear();
    const targetMonth = parseInt(month as string) || new Date().getMonth() + 1;

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const Order = (await import('../models/order.model')).default;
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate('user', 'name email phone')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .lean();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[targetMonth - 1];

    // Build CSV
    let csv = `AMOHA Mobiles - Sales Report\n`;
    csv += `Period: ${monthName} ${targetYear}\n`;
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    csv += `Order Number,Date,Customer,Email,Phone,Items,Subtotal,Discount,Delivery,Total,Payment Status,Order Status\n`;

    const sanitizeCsv = (val: string) => {
      if (/^[=+\-@\t\r]/.test(val)) return `'${val}`;
      return val;
    };

    let totalRevenue = 0;
    let totalOrders = orders.length;
    let totalDiscount = 0;

    orders.forEach((order: any) => {
      const items = order.items.map((i: any) => `${i.product?.name || 'N/A'} x${i.quantity}`).join('; ');
      csv += `${sanitizeCsv(order.orderNumber)},${new Date(order.createdAt).toLocaleDateString()},${sanitizeCsv(order.user?.name || 'N/A')},${sanitizeCsv(order.user?.email || 'N/A')},${sanitizeCsv(order.shippingAddress?.phone || 'N/A')},"${sanitizeCsv(items)}",${order.subtotal},${order.discount},${order.deliveryCharge},${order.totalAmount},${order.paymentStatus},${order.orderStatus}\n`;
      if (order.paymentStatus === 'paid') totalRevenue += order.totalAmount;
      totalDiscount += order.discount || 0;
    });

    csv += `\nSummary\n`;
    csv += `Total Orders,${totalOrders}\n`;
    csv += `Total Revenue (Paid),${totalRevenue}\n`;
    csv += `Total Discounts,${totalDiscount}\n`;
    csv += `Average Order Value,${totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0}\n`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${monthName}-${targetYear}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

router.get('/reports/inventory', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const Product = (await import('../models/product.model')).default;
    const products = await Product.find()
      .select('name slug brand category price originalPrice stock inStock ratings numReviews isFeatured isTrending')
      .sort({ stock: 1 })
      .lean();

    let csv = `AMOHA Mobiles - Inventory Report\n`;
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    csv += `Name,Brand,Category,Price,Original Price,Stock,In Stock,Ratings,Reviews,Featured,Trending\n`;

    let totalProducts = products.length;
    const sanitizeInv = (val: string) => {
      if (/^[=+\-@\t\r]/.test(val)) return `'${val}`;
      return val;
    };

    let totalStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalValue = 0;

    products.forEach((p: any) => {
      csv += `"${sanitizeInv(p.name)}",${sanitizeInv(p.brand)},${sanitizeInv(p.category)},${p.price},${p.originalPrice},${p.stock},${p.inStock ? 'Yes' : 'No'},${p.ratings},${p.numReviews},${p.isFeatured ? 'Yes' : 'No'},${p.isTrending ? 'Yes' : 'No'}\n`;
      totalStock += p.stock;
      if (p.stock === 0) outOfStock++;
      else if (p.stock <= 5) lowStock++;
      totalValue += p.price * p.stock;
    });

    csv += `\nSummary\n`;
    csv += `Total Products,${totalProducts}\n`;
    csv += `Total Stock Units,${totalStock}\n`;
    csv += `Low Stock (<=5),${lowStock}\n`;
    csv += `Out of Stock,${outOfStock}\n`;
    csv += `Total Inventory Value,${totalValue}\n`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=inventory-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

// ====== Products ======
router.get('/products', productController.getAll);
router.get('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const Product = (await import('../models/product.model')).default;
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      const { NotFoundError } = await import('../errors/app-error');
      throw new NotFoundError('Product');
    }
    sendSuccess(res, product, 'Product fetched');
  } catch (error) {
    next(error);
  }
});
router.post('/products', validate(createProductSchema), productController.create);
router.put('/products/:id', validate(updateProductSchema), productController.update);
router.delete('/products/:id', productController.delete);
router.patch('/products/:id/stock', productController.updateStock);

// ====== Categories ======
router.get('/categories', categoryController.getAllAdmin);
router.get('/categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const Category = (await import('../models/category.model')).default;
    const category = await Category.findById(req.params.id).lean();
    if (!category) {
      const { NotFoundError } = await import('../errors/app-error');
      throw new NotFoundError('Category');
    }
    sendSuccess(res, category, 'Category fetched');
  } catch (error) {
    next(error);
  }
});
router.post('/categories', categoryController.create);
router.put('/categories/:id', categoryController.update);
router.delete('/categories/:id', categoryController.delete);

// ====== Brands ======
router.get('/brands', brandController.getAllAdmin);
router.get('/brands/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const Brand = (await import('../models/brand.model')).default;
    const brand = await Brand.findById(req.params.id).lean();
    if (!brand) {
      const { NotFoundError } = await import('../errors/app-error');
      throw new NotFoundError('Brand');
    }
    sendSuccess(res, brand, 'Brand fetched');
  } catch (error) {
    next(error);
  }
});
router.post('/brands', brandController.create);
router.put('/brands/:id', brandController.update);
router.delete('/brands/:id', brandController.delete);

// ====== Orders ======
router.get('/orders', orderController.getAllOrders);
router.get('/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const Order = (await import('../models/order.model')).default;
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name thumbnail price')
      .lean();
    if (!order) {
      const { NotFoundError } = await import('../errors/app-error');
      throw new NotFoundError('Order');
    }
    sendSuccess(res, order, 'Order fetched');
  } catch (error) {
    next(error);
  }
});
router.patch('/orders/:id/status', validate(updateOrderStatusSchema), orderController.updateOrderStatus);
router.post('/orders/:id/refund', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const Order = (await import('../models/order.model')).default;
    const Product = (await import('../models/product.model')).default;
    const order = await Order.findById(req.params.id);
    if (!order) {
      const { NotFoundError } = await import('../errors/app-error');
      throw new NotFoundError('Order');
    }
    order.orderStatus = 'returned' as any;
    order.statusHistory.push({
      status: 'returned',
      date: new Date(),
      message: `Refund processed: ${req.body.reason || 'No reason provided'}`,
    });
    order.paymentStatus = 'refunded' as any;
    await order.save();

    // Restore stock for refunded items
    for (const item of order.items) {
      const product = await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } },
        { new: true },
      );
      if (product && product.stock > 0) {
        product.inStock = true;
        await product.save();
      }
    }

    const updated = await Order.findById(order._id).populate('items.product');
    sendSuccess(res, updated, 'Refund processed');
  } catch (error) {
    next(error);
  }
});

// ====== Users ======
router.get('/users', userController.getAllUsers);
router.get('/users/:id', userController.getUserById);
router.patch('/users/:id/block', userController.toggleBlock);
router.delete('/users/:id', userController.deleteUser);

// ====== Banners ======
router.get('/banners', bannerController.getAllAdmin);
router.post('/banners', bannerController.create);
router.put('/banners/:id', bannerController.update);
router.patch('/banners/:id/toggle', bannerController.toggleActive);
router.delete('/banners/:id', bannerController.delete);

// ====== Coupons ======
router.get('/coupons', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await couponService.getAll();
    sendSuccess(res, coupons, 'Coupons fetched');
  } catch (error) {
    next(error);
  }
});
router.get('/coupons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const Coupon = (await import('../models/coupon.model')).default;
    const coupon = await Coupon.findById(req.params.id).lean();
    if (!coupon) {
      const { NotFoundError } = await import('../errors/app-error');
      throw new NotFoundError('Coupon');
    }
    sendSuccess(res, coupon, 'Coupon fetched');
  } catch (error) {
    next(error);
  }
});
router.post('/coupons', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await couponService.create(req.body);
    sendCreated(res, coupon, 'Coupon created');
  } catch (error) {
    next(error);
  }
});
router.put('/coupons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await couponService.update(req.params.id, req.body);
    sendSuccess(res, coupon, 'Coupon updated');
  } catch (error) {
    next(error);
  }
});
router.delete('/coupons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await couponService.delete(req.params.id);
    sendMessage(res, 'Coupon deleted');
  } catch (error) {
    next(error);
  }
});

// ====== Reviews ======
router.get('/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await productService.getAllReviews(page, limit);
    sendSuccess(res, result, 'Reviews fetched');
  } catch (error) {
    next(error);
  }
});
router.patch('/reviews/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Reviews are embedded in products, so this is a no-op status update for now
    sendSuccess(res, { _id: req.params.id, status: req.body.status }, 'Review status updated');
  } catch (error) {
    next(error);
  }
});
router.patch('/reviews/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, { _id: req.params.id, status: 'approved' }, 'Review approved');
  } catch (error) {
    next(error);
  }
});
router.delete('/reviews/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Find and delete review from the product that contains it
    const Product = (await import('../models/product.model')).default;
    const product = await Product.findOne({ 'reviews._id': req.params.id });
    if (!product) {
      const { NotFoundError } = await import('../errors/app-error');
      throw new NotFoundError('Review');
    }
    product.reviews = product.reviews.filter(
      (r) => r._id?.toString() !== req.params.id,
    );
    product.numReviews = product.reviews.length;
    product.ratings = product.numReviews > 0
      ? Math.round((product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.numReviews) * 10) / 10
      : 0;
    await product.save();
    sendMessage(res, 'Review deleted');
  } catch (error) {
    next(error);
  }
});

// ====== Service Requests ======
router.get('/service-requests', serviceRequestController.getAll);
router.get('/service-requests/stats', serviceRequestController.getStats);
router.get('/service-requests/:id', serviceRequestController.getById);
router.patch('/service-requests/:id/status', serviceRequestController.updateStatus);
router.delete('/service-requests/:id', serviceRequestController.delete);

// ====== Contact Messages ======
router.get('/contact-messages', contactController.getAll);
router.get('/contact-messages/unread-count', contactController.getUnreadCount);
router.patch('/contact-messages/:id/read', contactController.markRead);
router.delete('/contact-messages/:id', contactController.delete);

// ====== Order Tracking (logistics) ======
router.patch('/orders/:id/tracking', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const Order = (await import('../models/order.model')).default;
    const { trackingNumber, trackingUrl, logisticsPartner } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { trackingNumber, trackingUrl, logisticsPartner },
      { new: true },
    ).populate('items.product', 'name thumbnail price');
    if (!order) {
      const { NotFoundError } = await import('../errors/app-error');
      throw new NotFoundError('Order');
    }
    sendSuccess(res, order, 'Tracking info updated');
  } catch (error) {
    next(error);
  }
});

// ====== Site Settings ======
router.get('/settings', settingsController.get);
router.put('/settings', settingsController.update);

// ====== Notifications ======
router.get('/notifications', notificationController.getAll);
router.get('/notifications/recent', notificationController.getRecent);
router.get('/notifications/unread-count', notificationController.getUnreadCount);
router.patch('/notifications/:id/read', notificationController.markRead);
router.patch('/notifications/read-all', notificationController.markAllRead);
router.delete('/notifications/clear', notificationController.clearAll);
router.delete('/notifications/:id', notificationController.delete);

// ====== Product View Tracking (User Browsing Activity) ======
router.get('/product-views', productViewController.getAll);
router.get('/product-views/user-summary', productViewController.getUserSummary);
router.get('/product-views/user/:userId', productViewController.getUserViews);

// ====== Cart Abandonment ======
router.get('/abandoned-carts', productViewController.getAbandonedCarts);
router.get('/abandoned-carts/download', productViewController.downloadAbandonedCarts);

// ====== Order Tracking Update ======
router.patch('/orders/:id/tracking', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const Order = (await import('../models/order.model')).default;
    const order = await Order.findById(req.params.id);
    if (!order) {
      const { NotFoundError } = await import('../errors/app-error');
      throw new NotFoundError('Order');
    }
    const { trackingNumber, trackingUrl, logisticsPartner, estimatedDelivery } = req.body;
    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (trackingUrl !== undefined) order.trackingUrl = trackingUrl;
    if (logisticsPartner !== undefined) order.logisticsPartner = logisticsPartner;
    if (estimatedDelivery !== undefined) order.estimatedDelivery = new Date(estimatedDelivery);
    await order.save();
    const updated = await Order.findById(order._id).populate('user', 'name email phone').populate('items.product', 'name thumbnail price').lean();
    sendSuccess(res, updated, 'Tracking info updated');
  } catch (error) {
    next(error);
  }
});

// ====== Barcode / SKU ======
router.get('/barcode/lookup/:code', barcodeController.lookup);
router.get('/barcode/stock/:code', barcodeController.stockCheck);
router.post('/barcode/bulk-lookup', barcodeController.bulkLookup);
router.post('/barcode/regenerate/:productId', barcodeController.regenerate);

// ====== CRM ======
router.get('/crm/customers', crmController.getCustomers);
router.get('/crm/customers/:customerId', crmController.getCustomerProfile);
router.post('/crm/customers/:customerId/notes', crmController.addNote);
router.delete('/crm/notes/:noteId', crmController.deleteNote);
router.get('/crm/segments', crmController.getSegmentSummary);

export default router;
