import mongoose, { Schema, Document } from 'mongoose';

export interface IProductView extends Document {
  user: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  viewedAt: Date;
  duration: number; // seconds spent on page (optional, sent on leave)
}

const productViewSchema = new Schema<IProductView>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    viewedAt: { type: Date, default: Date.now },
    duration: { type: Number, default: 0 },
  },
  { timestamps: false },
);

productViewSchema.index({ user: 1, viewedAt: -1 });
productViewSchema.index({ product: 1, viewedAt: -1 });
productViewSchema.index({ viewedAt: -1 });

export default mongoose.model<IProductView>('ProductView', productViewSchema);
