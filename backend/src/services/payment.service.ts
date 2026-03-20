import Razorpay from 'razorpay';
import crypto from 'crypto';
import env from '../config/env';
import Order from '../models/order.model';
import Cart from '../models/cart.model';
import Product from '../models/product.model';
import Coupon from '../models/coupon.model';
import { BadRequestError, AppError } from '../errors/app-error';
import logger from '../utils/logger.util';
import { v4 as uuidv4 } from 'uuid';

// Lazily initialised — startup does not fail when keys are placeholder strings
let _razorpay: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!_razorpay) {
    if (
      !env.RAZORPAY_KEY_ID ||
      !env.RAZORPAY_KEY_SECRET ||
      env.RAZORPAY_KEY_ID === 'your_razorpay_key_id' ||
      env.RAZORPAY_KEY_SECRET === 'your_razorpay_key_secret'
    ) {
      throw new AppError('Razorpay credentials are not configured', 503);
    }
    _razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

/** Calculates the cart total for a given userId + optional coupon. */
async function calculateCartTotals(userId: string, couponCode?: string) {
  const cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart || cart.items.length === 0) throw new BadRequestError('Cart is empty');

  const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
  let discount = 0;
  let couponData: any = undefined;

  const resolvedCode = couponCode?.toUpperCase().trim() || cart.coupon?.code;

  if (resolvedCode) {
    const coupon = await Coupon.findOne({
      code: resolvedCode,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (coupon && coupon.usedCount < coupon.usageLimit && subtotal >= coupon.minOrderAmount) {
      if (coupon.discountType === 'percentage') {
        discount = Math.round((subtotal * coupon.discount) / 100);
        if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
      } else {
        discount = coupon.discount;
      }
      couponData = {
        code: coupon.code,
        discount: coupon.discount,
        discountType: coupon.discountType,
        _couponId: coupon._id, // internal — for atomic increment later
      };
    }
  }

  // Fall back to coupon already attached to the cart if code lookup yielded nothing
  if (!couponData && cart.coupon?.code) {
    if (cart.coupon.discountType === 'percentage') {
      discount = Math.round((subtotal * cart.coupon.discount) / 100);
      if ((cart.coupon as any).maxDiscount && discount > (cart.coupon as any).maxDiscount) {
        discount = (cart.coupon as any).maxDiscount;
      }
    } else {
      discount = cart.coupon.discount;
    }
    couponData = cart.coupon;
  }

  const deliveryCharge = subtotal > 500 ? 0 : 49;
  const totalAmount = subtotal - discount + deliveryCharge;

  return { cart, subtotal, discount, deliveryCharge, totalAmount, couponData };
}

class PaymentService {
  /**
   * Step 1 — Create a Razorpay order.
   * The amount and currency are computed server-side; the client NEVER sends an amount.
   */
  async createRazorpayOrder(userId: string, couponCode?: string) {
    const { cart, subtotal, discount, deliveryCharge, totalAmount, couponData } =
      await calculateCartTotals(userId, couponCode);

    if (cart.items.length === 0) throw new BadRequestError('Cart is empty');

    // Amount in paise (smallest INR unit)
    const amountInPaise = Math.round(totalAmount * 100);

    // receipt is max 40 chars per Razorpay docs
    const receipt = `rcpt_${Date.now().toString(36)}_${uuidv4().slice(0, 6)}`.slice(0, 40);

    const razorpayOrder = await getRazorpay().orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        userId,
        // Helps reconcile on Razorpay dashboard
        cartSubtotal: String(subtotal),
      },
    });

    logger.info(`Razorpay order created: ${razorpayOrder.id} for user ${userId} amount ₹${totalAmount}`);

    return {
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: env.RAZORPAY_KEY_ID,
      subtotal,
      discount: couponData ? discount : discount,
      deliveryCharge,
      totalAmount,
    };
  }

  /**
   * Step 2 — Verify payment and create the confirmed order.
   * Performs three layers of verification:
   *   1. HMAC-SHA256 signature (timing-safe comparison)
   *   2. Razorpay API fetch — confirms payment status, amount, and order_id match
   *   3. Idempotency — unique sparse index + duplicate-key error trap prevents replay
   */
  async verifyAndCreateOrder(
    userId: string,
    data: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
      shippingAddress: any;
      couponCode?: string;
    },
  ) {
    // ── Layer 1: HMAC-SHA256 signature verification (timing-safe) ──────────────
    const hmac = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
      .digest('hex');

    const expectedBuf = Buffer.from(hmac, 'hex');
    const receivedBuf = Buffer.from(data.razorpaySignature, 'hex');

    // Lengths must match before timingSafeEqual (it throws if they differ)
    const signatureValid =
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf);

    if (!signatureValid) {
      logger.warn(`Payment signature mismatch — userId=${userId} orderId=${data.razorpayOrderId} paymentId=${data.razorpayPaymentId}`);
      throw new BadRequestError('Payment verification failed: invalid signature');
    }

    // ── Layer 2: Razorpay API confirmation ─────────────────────────────────────
    // Fetch the payment from Razorpay to confirm:
    //   • status is 'captured' (funds secured)
    //   • order_id matches what this server issued
    //   • amount and currency match the server-computed cart total
    const rzp = getRazorpay();

    let rzpPayment: any;
    try {
      rzpPayment = await rzp.payments.fetch(data.razorpayPaymentId);
    } catch (err) {
      logger.error(`Razorpay payment fetch failed for ${data.razorpayPaymentId}:`, err);
      throw new AppError('Unable to confirm payment with Razorpay. Please contact support.', 502);
    }

    if (rzpPayment.status !== 'captured') {
      logger.warn(`Payment not captured — status=${rzpPayment.status} paymentId=${data.razorpayPaymentId}`);
      throw new BadRequestError(`Payment has not been captured (status: ${rzpPayment.status})`);
    }

    if (rzpPayment.order_id !== data.razorpayOrderId) {
      logger.warn(`Order ID mismatch — expected=${data.razorpayOrderId} got=${rzpPayment.order_id}`);
      throw new BadRequestError('Payment verification failed: order ID mismatch');
    }

    if (rzpPayment.currency !== 'INR') {
      throw new BadRequestError('Payment currency mismatch');
    }

    // ── Layer 2b: Recompute the expected amount from the cart ─────────────────
    const { cart, subtotal, discount, deliveryCharge, totalAmount, couponData } =
      await calculateCartTotals(userId, data.couponCode);

    const expectedAmountInPaise = Math.round(totalAmount * 100);

    if (rzpPayment.amount !== expectedAmountInPaise) {
      logger.warn(
        `Amount mismatch — expected=${expectedAmountInPaise} paid=${rzpPayment.amount} userId=${userId}`,
      );
      throw new BadRequestError(
        'Payment amount does not match order total. Please contact support.',
      );
    }

    // ── Layer 3: Stock verification ────────────────────────────────────────────
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (!product || !product.inStock || product.stock < item.quantity) {
        throw new BadRequestError(
          `Product "${product?.name || 'Unknown'}" is unavailable or has insufficient stock.`,
        );
      }
    }

    const orderItems = cart.items.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      price: item.price,
      color: item.color,
    }));

    // ── Create order (handles replay via unique sparse index) ──────────────────
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 6);

    const orderNumber = `AMH-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 6).toUpperCase()}`;

    // Atomically increment coupon usedCount to prevent concurrent over-redemption
    const cleanCouponData = couponData ? { ...couponData } : undefined;
    if (cleanCouponData?._couponId) {
      const result = await Coupon.findOneAndUpdate(
        {
          _id: cleanCouponData._couponId,
          isActive: true,
          usedCount: { $lt: 9999999 }, // sanity guard
        },
        { $inc: { usedCount: 1 } },
      );
      if (!result) {
        // Coupon became invalid between step-1 and step-2 (expired or limit hit)
        logger.warn(`Coupon ${cleanCouponData.code} no longer valid at order creation`);
      }
      delete cleanCouponData._couponId; // don't persist internal field to DB
    }

    let order;
    try {
      order = await Order.create({
        orderNumber,
        user: userId,
        items: orderItems,
        shippingAddress: data.shippingAddress,
        paymentMethod: 'razorpay',
        paymentStatus: 'paid',
        orderStatus: 'placed',
        statusHistory: [
          { status: 'placed', date: new Date(), message: 'Order placed and payment confirmed via Razorpay' },
        ],
        subtotal,
        discount,
        deliveryCharge,
        totalAmount,
        coupon: cleanCouponData,
        estimatedDelivery,
        razorpayOrderId: data.razorpayOrderId,
        razorpayPaymentId: data.razorpayPaymentId,
        razorpaySignature: data.razorpaySignature,
      });
    } catch (err: any) {
      // E11000 = duplicate key — the razorpayOrderId sparse unique index caught a replay
      if (err.code === 11000) {
        logger.warn(`Replay attack detected — razorpayOrderId=${data.razorpayOrderId} userId=${userId}`);
        throw new BadRequestError('This payment has already been processed');
      }
      throw err;
    }

    // Deduct stock and update inStock flag
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

    // Clear cart
    cart.items = [];
    cart.coupon = undefined;
    await cart.save();

    logger.info(`Order ${order.orderNumber} created successfully — userId=${userId} amount=₹${totalAmount}`);

    return Order.findById(order._id).populate('items.product');
  }
}


export default new PaymentService();
