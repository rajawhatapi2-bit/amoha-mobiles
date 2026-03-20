import mongoose, { Schema, Document } from 'mongoose';

export interface IPopupSettings {
  isActive: boolean;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  buttonText: string;
  buttonLink: string;
  bgColor: string;
}

export interface IDiscoverBanner {
  _id?: string;
  title: string;
  image: string;
  link: string;
  size: 'large' | 'small';
  order: number;
  isActive: boolean;
}

export interface IPromoBanner {
  image: string;
  link: string;
  isActive: boolean;
}

export interface ISiteSettings extends Document {
  siteName: string;
  tagline: string;
  logo: string;
  favicon: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  deliveryCharge: number;
  freeDeliveryAbove: number;
  socialLinks: {
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  };
  announcement: string;
  isAnnouncementActive: boolean;
  popup: IPopupSettings;
  discoverBanners: IDiscoverBanner[];
  promoBanner: IPromoBanner;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  updatedAt: Date;
}

const discoverBannerSchema = new Schema<IDiscoverBanner>(
  {
    title: { type: String, default: '' },
    image: { type: String, default: '' },
    link: { type: String, default: '' },
    size: { type: String, enum: ['large', 'small'], default: 'small' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

const settingsSchema = new Schema<ISiteSettings>(
  {
    siteName: { type: String, default: 'AMOHA Mobiles' },
    tagline: { type: String, default: 'Explore Plus' },
    logo: { type: String, default: '' },
    favicon: { type: String, default: '' },
    contactEmail: { type: String, default: 'support@amoha.com' },
    contactPhone: { type: String, default: '+91 98765 43210' },
    address: { type: String, default: 'Mumbai, India' },
    deliveryCharge: { type: Number, default: 49 },
    freeDeliveryAbove: { type: Number, default: 999 },
    socialLinks: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      twitter: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },
    announcement: { type: String, default: '' },
    isAnnouncementActive: { type: Boolean, default: false },
    popup: {
      isActive: { type: Boolean, default: false },
      title: { type: String, default: '' },
      subtitle: { type: String, default: '' },
      description: { type: String, default: '' },
      image: { type: String, default: '' },
      buttonText: { type: String, default: 'Shop Now' },
      buttonLink: { type: String, default: '/products' },
      bgColor: { type: String, default: '#1a1a2e' },
    },
    discoverBanners: [discoverBannerSchema],
    promoBanner: {
      image: { type: String, default: '' },
      link: { type: String, default: '' },
      isActive: { type: Boolean, default: false },
    },
    smtpHost: { type: String, default: '' },
    smtpPort: { type: Number, default: 587 },
    smtpUser: { type: String, default: '' },
    smtpPass: { type: String, default: '' },
    smtpFrom: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { transform(_doc, ret) { delete (ret as any).__v; return ret; } },
  },
);

const SiteSettings = mongoose.model<ISiteSettings>('SiteSettings', settingsSchema);
export default SiteSettings;
