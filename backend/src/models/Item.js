import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['lost', 'found'],
      required: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    keywords: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    imageHash: {
      type: String,
      default: '',
      trim: true,
    },
    aiMappedDescription: {
      type: String,
      default: '',
      trim: true,
    },
    aiMappedKeywords: {
      type: [String],
      default: [],
    },
    aiMappedCategory: {
      type: String,
      default: '',
      trim: true,
    },
    aiMappedLocationHint: {
      type: String,
      default: '',
      trim: true,
    },
    aiProvider: {
      type: String,
      default: 'fallback',
      trim: true,
    },
    aiConfidence: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'resolved'],
      default: 'active',
    },
  },
  { timestamps: true }
);

itemSchema.index({
  title: 'text',
  description: 'text',
  keywords: 'text',
  aiMappedDescription: 'text',
  aiMappedKeywords: 'text',
  aiMappedCategory: 'text',
  category: 'text',
  location: 'text',
  aiMappedLocationHint: 'text',
});

const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);

export default Item;
