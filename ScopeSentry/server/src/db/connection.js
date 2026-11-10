import mongoose from 'mongoose';
import { config } from '../config/env.js';

let isConnected = false;

export async function connectDatabase() {
  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(config.mongoUri, {
      dbName: config.mongoDbName,
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    return mongoose.connection;
  } catch (error) {
    // Never log raw connection URI or secrets
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
}
