import mongoose from 'mongoose';

export const connectDatabase = async (mongoUri) => {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing.');
  }

  await mongoose.connect(mongoUri);
  console.log('MongoDB connected.');
};
