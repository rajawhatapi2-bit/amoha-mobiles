import mongoose, { Schema, Document } from 'mongoose';

export interface IStatusHistory {
  status: string;
  date: Date;
  message: string;
}

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  color?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  user: mongoose.Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    type: 'home' | 'work' | 'other';
  };
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus: 'placed' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned';
  statusHistory: IStatusHistory[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  totalAmount: number;
  coupon?: {
    code: string;
    discount: number;
    discountType: 'percentage' | 'fixed';
  };
  estimatedDelivery: Date;
  deliveredAt?: Date;
  cancelReason?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  logisticsPartner?: 'dhl' | 'professional_courier' | 'other';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  createdAt: Date;
  updatedAt: Date;
}

const statusHistorySchema = new Schema<IStatusHistory>(
  {
    status: { type: String, required: true },
    date: { type: Date, default: Date.now },
    message: { type: String, default: '' },
  },
  { _id: false },
);

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    color: { type: String },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [orderItemSchema],
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      type: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
    },
    paymentMethod: { type: String, required: true, default: 'cod' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    orderStatus: {
      type: String,
      enum: ['placed', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
      default: 'placed',
      index: true,
    },
    statusHistory: [statusHistorySchema],
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    coupon: {
      code: { type: String },
      discount: { type: Number },
      discountType: { type: String, enum: ['percentage', 'fixed'] },
    },
    estimatedDelivery: { type: Date },
    deliveredAt: { type: Date },
    cancelReason: { type: String },
    trackingNumber: { type: String, trim: true },
    trackingUrl: { type: String, trim: true },
    logisticsPartner: {
      type: String,
      enum: ['dhl', 'professional_courier', 'other'],
    },
    razorpayOrderId: { type: String, index: true, sparse: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
  },
  {
    timestamps: true,
    toJSON: { transform(_doc, ret) { delete (ret as any).__v; return ret; } },
  },
);

orderSchema.index({ user: 1, createdAt: -1 });
// orderStatus index already defined at field level
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model<IOrder>('Order', orderSchema);
export default Order;
