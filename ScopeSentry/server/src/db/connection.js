import mongoose from 'mongoose';
import { config } from '../config/env.js';

let isConnected = false;

export async function connectDatabase() {
  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    let uri = config.mongoUri;
    // Ensure database name case in URI matches config.mongoDbName
    if (uri && uri.includes('/scopesentry')) {
      uri = uri.replace('/scopesentry', `/${config.mongoDbName}`);
    }

    await mongoose.connect(uri, {
      dbName: config.mongoDbName,
      serverSelectionTimeoutMS: 20000
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
