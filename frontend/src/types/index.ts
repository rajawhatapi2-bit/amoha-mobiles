// ==================== Product Types ====================
export interface Product {
  _id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice: number;
  discount: number;
  images: string[];
  thumbnail: string;
  specifications: ProductSpecifications;
  stock: number;
  inStock: boolean;
  ratings: number;
  numReviews: number;
  reviews: Review[];
  tags: string[];
  isFeatured: boolean;
  isTrending: boolean;
  colors: string[];
  warranty: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSpecifications {
  display: string;
  displaySize: string;
  processor: string;
  ram: string;
  storage: string;
  expandableStorage: string;
  battery: string;
  chargingSpeed: string;
  rearCamera: string;
  frontCamera: string;
  os: string;
  network: string;
  sim: string;
  weight: string;
  dimensions: string;
  waterResistant: string;
  fingerprint: string;
  nfc: boolean;
  [key: string]: string | boolean;
}

export interface Review {
  _id: string;
  user: ReviewUser;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
}

export interface ReviewUser {
  _id: string;
  name: string;
  avatar?: string;
}

export interface ProductFilters {
  brand?: string[];
  priceMin?: number;
  priceMax?: number;
  ram?: string[];
  storage?: string[];
  battery?: string[];
  rating?: number;
  sort?: string;
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}

export interface ProductsResponse {
  products: Product[];
  totalProducts: number;
  totalPages: number;
  currentPage: number;
  hasMore: boolean;
}

// ==================== User Types ====================
export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  addresses: Address[];
  role: 'user' | 'admin';
  isVerified: boolean;
  kyc?: KycInfo;
  createdAt: string;
  updatedAt: string;
}

export interface KycInfo {
  status: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  documentType?: 'aadhaar' | 'pan' | 'passport' | 'voter_id';
  documentNumber?: string;
  documentImage?: string;
  fullName?: string;
  submittedAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface Address {
  _id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  type: 'home' | 'work' | 'other';
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

// ==================== Cart Types ====================
export interface CartItem {
  _id: string;
  product: Product;
  quantity: number;
  color?: string;
  price: number;
  totalPrice: number;
}

export interface Cart {
  _id: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  totalAmount: number;
  coupon?: AppliedCoupon;
}

export interface AppliedCoupon {
  code: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
}

// ==================== Order Types ====================
export interface Order {
  _id: string;
  orderNumber: string;
  user: string;
  items: OrderItem[];
  shippingAddress: Address;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus: OrderStatus;
  statusHistory: StatusHistory[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  totalAmount: number;
  coupon?: AppliedCoupon;
  estimatedDelivery: string;
  deliveredAt?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  logisticsPartner?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  product: Product;
  quantity: number;
  price: number;
  color?: string;
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

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

// ==================== Wishlist Types ====================
export interface WishlistItem {
  _id: string;
  product: Product;
  addedAt: string;
}

// ==================== Banner & Category Types ====================
export interface Banner {
  _id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  isActive: boolean;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  productCount: number;
}

// ==================== Coupon Types ====================
export interface Coupon {
  code: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  minOrderAmount: number;
  maxDiscount?: number;
  isValid: boolean;
  message: string;
}

// ==================== Payment Types ====================
export interface RazorpayOrderResponse {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  totalAmount: number;
}

// ==================== Compare Types ====================
export interface CompareItem {
  product: Product;
}

// ==================== API Response Types ====================
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string>;
}

// ==================== Pagination ====================
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasMore: boolean;
}

// ==================== Search ====================
export interface SearchSuggestion {
  _id: string;
  name: string;
  slug: string;
  thumbnail: string;
  price: number;
  brand: string;
}
