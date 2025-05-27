import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    console.log('✅ Using existing database connection');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      // add your mongoose options if needed
    });

    isConnected = true;
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Failed to connect to database', error);
    throw error;
  }
}

export { mongoose };
