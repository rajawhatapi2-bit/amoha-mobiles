import Order from '../models/order.model';
import Cart from '../models/cart.model';
import Product from '../models/product.model';
import Coupon from '../models/coupon.model';
import { NotFoundError, BadRequestError } from '../errors/app-error';
import { v4 as uuidv4 } from 'uuid';

class OrderService {
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().slice(0, 6).toUpperCase();
    return `AMH-${timestamp}-${random}`;
  }

  async create(userId: string, data: {
    shippingAddress: any;
    paymentMethod: string;
    couponCode?: string;
  }) {
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      throw new BadRequestError('Cart is empty');
    }

    // Verify stock availability for all items
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (!product || !product.inStock || product.stock < item.quantity) {
        throw new BadRequestError(
          `Product "${product?.name || 'Unknown'}" is out of stock or has insufficient quantity`,
        );
      }
    }

    // Build order items
    const orderItems = cart.items.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      price: item.price,
      color: item.color,
    }));

    // Calculate totals
    let subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    let discount = 0;
    let couponData: any = undefined;

    // Apply coupon if provided
    if (data.couponCode) {
      const coupon = await Coupon.findOne({
        code: data.couponCode.toUpperCase(),
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      if (coupon && coupon.usedCount < coupon.usageLimit && subtotal >= coupon.minOrderAmount) {
        if (coupon.discountType === 'percentage') {
          discount = Math.round((subtotal * coupon.discount) / 100);
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
        } else {
          discount = coupon.discount;
        }

        couponData = {
          code: coupon.code,
          discount: coupon.discount,
          discountType: coupon.discountType,
        };

        // Increment coupon usage
        coupon.usedCount += 1;
        await coupon.save();
      }
    } else if (cart.coupon && cart.coupon.code) {
      // Use coupon already applied to cart
      if (cart.coupon.discountType === 'percentage') {
        discount = Math.round((subtotal * cart.coupon.discount) / 100);
        if (cart.coupon.maxDiscount && discount > cart.coupon.maxDiscount) {
          discount = cart.coupon.maxDiscount;
        }
      } else {
        discount = cart.coupon.discount;
      }
      couponData = cart.coupon;
    }

    const deliveryCharge = subtotal > 500 ? 0 : 49;
    const totalAmount = subtotal - discount + deliveryCharge;

    // Estimated delivery: 5-7 days
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 6);

    const order = await Order.create({
      orderNumber: this.generateOrderNumber(),
      user: userId,
      items: orderItems,
      shippingAddress: data.shippingAddress,
      paymentMethod: data.paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'placed',
      statusHistory: [
        {
          status: 'placed',
          date: new Date(),
          message: 'Order has been placed successfully',
        },
      ],
      subtotal,
      discount,
      deliveryCharge,
      totalAmount,
      coupon: couponData,
      estimatedDelivery,
    });

    // Reduce product stock and update inStock flag
    for (const item of cart.items) {
      const product = await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } },
        { new: true },
      );
      if (product && product.stock <= 0) {
        product.inStock = false;
        await product.save();
      }
    }

    // Clear the cart
    cart.items = [];
    cart.coupon = undefined;
    await cart.save();

    // Populate and return
    return Order.findById(order._id).populate('items.product');
  }

  async getAll(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [orders, totalOrders] = await Promise.all([
      Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.product')
        .lean(),
      Order.countDocuments({ user: userId }),
    ]);

    return {
      orders,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
    };
  }

  async getById(orderId: string, userId: string) {
    const order = await Order.findOne({ _id: orderId, user: userId })
      .populate('items.product')
      .lean();
    if (!order) throw new NotFoundError('Order');
    return order;
  }

  async cancel(orderId: string, userId: string, reason: string) {
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) throw new NotFoundError('Order');

    const cancellableStatuses = ['placed', 'confirmed', 'processing'];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      throw new BadRequestError('Order cannot be cancelled at this stage');
    }

    order.orderStatus = 'cancelled';
    order.cancelReason = reason;
    order.statusHistory.push({
      status: 'cancelled',
      date: new Date(),
      message: `Order cancelled: ${reason}`,
    });

    // Restore stock and update inStock flag
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

    // Refund coupon usage if applicable
    if (order.coupon?.code) {
      await Coupon.findOneAndUpdate(
        { code: order.coupon.code },
        { $inc: { usedCount: -1 } },
      );
    }

    await order.save();
    return Order.findById(order._id).populate('items.product');
  }

  async trackOrder(orderId: string, userId: string) {
    const order = await Order.findOne({ _id: orderId, user: userId })
      .populate('items.product')
      .lean();
    if (!order) throw new NotFoundError('Order');
    return order;
  }

  // ====== Admin methods ======
  async getAllOrders(page: number = 1, limit: number = 20, status?: string) {
    const skip = (page - 1) * limit;
    const query: any = {};
    if (status) query.orderStatus = status;

    const [orders, totalOrders] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email phone')
        .populate('items.product', 'name thumbnail price')
        .lean(),
      Order.countDocuments(query),
    ]);

    return {
      orders,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
    };
  }

  async updateOrderStatus(orderId: string, status: string, message?: string) {
    const order = await Order.findById(orderId);
    if (!order) throw new NotFoundError('Order');

    order.orderStatus = status as any;
    order.statusHistory.push({
      status,
      date: new Date(),
      message: message || `Order status updated to ${status}`,
    });

    if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.paymentStatus = 'paid';
    }

    await order.save();
    return Order.findById(order._id).populate('items.product');
  }
}

export default new OrderService();
