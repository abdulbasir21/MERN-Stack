import mongoose from "mongoose";

const mongourl = process.env.MONGOURL;

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(mongourl, { bufferCommands: false });
    isConnected = true;
    console.log("Connected to DB");
  } catch (err) {
    console.error("DB connection error:", err);
    throw err;
  }
};

export default connectDB;
