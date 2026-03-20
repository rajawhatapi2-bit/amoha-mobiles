// ==================== API ====================
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasMore: boolean;
}

// ==================== Auth ====================
export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: 'admin' | 'user';
  isVerified: boolean;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: AdminUser;
}

// ==================== Dashboard ====================
export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  revenueGrowth: number;
  ordersGrowth: number;
  productsGrowth: number;
  usersGrowth: number;
}

export interface RevenueData {
  month: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  _id: string;
  name: string;
  thumbnail: string;
  totalSold: number;
  revenue: number;
}

export interface RecentOrder {
  _id: string;
  orderNumber: string;
  user: { name: string; email: string };
  totalAmount: number;
  orderStatus: OrderStatus;
  createdAt: string;
}

// ==================== Product ====================
export interface Product {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  brand: string | Brand;
  category: string | Category;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice: number;
  discount: number;
  images: string[];
  thumbnail: string;
  specifications: Record<string, string | boolean>;
  stock: number;
  inStock: boolean;
  ratings: number;
  numReviews: number;
  tags: string[];
  isFeatured: boolean;
  isTrending: boolean;
  colors: string[];
  warranty: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFormData {
  name: string;
  brand: string;
  category: string;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice: number;
  stock: number;
  tags: string;
  isFeatured: boolean;
  isTrending: boolean;
  colors: string;
  warranty: string;
  specifications: Record<string, string>;
}

export interface ProductsResponse {
  products: Product[];
  totalProducts: number;
  totalPages: number;
  currentPage: number;
}

// ==================== Category ====================
export interface Category {
  _id: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  productCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface CategoryFormData {
  name: string;
  description: string;
  image: string;
  isActive: boolean;
}

// ==================== Brand ====================
export interface Brand {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  isActive: boolean;
  productCount: number;
  createdAt: string;
}

export interface BrandFormData {
  name: string;
  logo: string;
  description: string;
  isActive: boolean;
}

// ==================== Order ====================
export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  _id: string;
  orderNumber: string;
  user: { _id: string; name: string; email: string; phone: string };
  items: OrderItem[];
  shippingAddress: Address;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  statusHistory: StatusHistory[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  totalAmount: number;
  estimatedDelivery: string;
  deliveredAt?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  logisticsPartner?: 'dhl' | 'professional_courier' | 'other';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  product: { _id: string; name: string; thumbnail: string };
  quantity: number;
  price: number;
  color?: string;
}

export interface Address {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface StatusHistory {
  status: OrderStatus;
  date: string;
  message: string;
}

export interface OrdersResponse {
  orders: Order[];
  totalOrders: number;
  totalPages: number;
  currentPage: number;
}

// ==================== User ====================
export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  isBlocked: boolean;
  totalOrders: number;
  totalSpent: number;
  kyc?: {
    status: 'not_submitted' | 'pending' | 'verified' | 'rejected';
    documentType?: string;
    documentNumber?: string;
    fullName?: string;
    rejectionReason?: string;
  };
  createdAt: string;
}

export interface UsersResponse {
  users: User[];
  totalUsers: number;
  totalPages: number;
  currentPage: number;
}

// ==================== Coupon ====================
export interface Coupon {
  _id: string;
  code: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  minOrderAmount: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface CouponFormData {
  code: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  minOrderAmount: number;
  maxDiscount?: number;
  usageLimit: number;
  isActive: boolean;
  expiresAt: string;
}

// ==================== Banner ====================
export interface Banner {
  _id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  position: 'hero' | 'sidebar' | 'popup' | 'footer';
  isActive: boolean;
  order: number;
  createdAt: string;
}

export interface BannerFormData {
  title: string;
  subtitle: string;
  image: string;
  link: string;
  position: 'hero' | 'sidebar' | 'popup' | 'footer';
  isActive: boolean;
  order: number;
}

// ==================== Review ====================
export interface Review {
  _id: string;
  product: { _id: string; name: string; thumbnail: string };
  user: { _id: string; name: string; avatar?: string };
  rating: number;
  title: string;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  isApproved: boolean;
  createdAt: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  totalReviews: number;
  totalPages: number;
  currentPage: number;
}

// ==================== Settings ====================
export interface SiteSettings {
  siteName: string;
  siteEmail: string;
  sitePhone: string;
  logo: string;
  favicon: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  stripePublishableKey: string;
  stripeSecretKey: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  deliveryCharge: number;
  freeDeliveryAbove: number;
  gstPercentage: number;
}

// ==================== Filters ====================
export interface TableFilters {
  page: number;
  limit: number;
  search: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | undefined;
}
