import mongoose, { Schema, Document } from 'mongoose';

export interface ICrmNote extends Document {
  customer: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  type: 'note' | 'call' | 'email' | 'meeting' | 'follow_up';
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const crmNoteSchema = new Schema<ICrmNote>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['note', 'call', 'email', 'meeting', 'follow_up'],
      default: 'note',
    },
    content: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

crmNoteSchema.index({ customer: 1, createdAt: -1 });

export default mongoose.model<ICrmNote>('CrmNote', crmNoteSchema);
