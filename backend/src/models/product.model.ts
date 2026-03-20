import mongoose, { Schema, Document } from 'mongoose';

export interface IReview {
  _id?: string;
  user: mongoose.Types.ObjectId;
  rating: number;
  title: string;
  comment: string;
  createdAt: Date;
}

export interface IProductSpecifications {
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

export interface IProduct extends Document {
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  brand: string;
  category: string;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice: number;
  discount: number;
  images: string[];
  thumbnail: string;
  specifications: IProductSpecifications;
  stock: number;
  inStock: boolean;
  ratings: number;
  numReviews: number;
  reviews: IReview[];
  tags: string[];
  isFeatured: boolean;
  isTrending: boolean;
  colors: string[];
  warranty: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: '', trim: true },
    comment: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    sku: { type: String, unique: true, sparse: true, trim: true, index: true },
    barcode: { type: String, unique: true, sparse: true, trim: true, index: true },
    brand: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true },
    shortDescription: { type: String, default: '' },
    price: { type: Number, required: true, min: 0, index: true },
    originalPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    images: [{ type: String }],
    thumbnail: { type: String, required: true },
    specifications: {
      display: { type: String, default: '' },
      displaySize: { type: String, default: '' },
      processor: { type: String, default: '' },
      ram: { type: String, default: '', index: true },
      storage: { type: String, default: '', index: true },
      expandableStorage: { type: String, default: '' },
      battery: { type: String, default: '' },
      chargingSpeed: { type: String, default: '' },
      rearCamera: { type: String, default: '' },
      frontCamera: { type: String, default: '' },
      os: { type: String, default: '' },
      network: { type: String, default: '' },
      sim: { type: String, default: '' },
      weight: { type: String, default: '' },
      dimensions: { type: String, default: '' },
      waterResistant: { type: String, default: '' },
      fingerprint: { type: String, default: '' },
      nfc: { type: Boolean, default: false },
    },
    stock: { type: Number, required: true, default: 0, min: 0 },
    inStock: { type: Boolean, default: true, index: true },
    ratings: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
    reviews: [reviewSchema],
    tags: [{ type: String, trim: true }],
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    colors: [{ type: String, trim: true }],
    warranty: { type: String, default: '', trim: true },
  },
  {
    timestamps: true,
    toJSON: { transform(_doc, ret) { delete (ret as any).__v; return ret; } },
  },
);

// Compound indexes for performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ brand: 1, category: 1 });
productSchema.index({ price: 1, ratings: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isFeatured: 1, isTrending: 1 });

// Pre-save: auto-set inStock + auto-generate SKU/barcode if missing
productSchema.pre('save', function (next) {
  this.inStock = this.stock > 0;
  if (!this.sku) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.sku = `AMH-${ts}-${rand}`;
  }
  if (!this.barcode) {
    // Generate EAN-13 compatible 13-digit numeric barcode
    const base = '200' + Date.now().toString().slice(-9);
    const digits = base.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    const check = (10 - (sum % 10)) % 10;
    this.barcode = base + check;
  }
  next();
});

const Product = mongoose.model<IProduct>('Product', productSchema);
export default Product;
