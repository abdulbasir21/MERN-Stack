// models/Review.js
import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "" },
}, { timestamps: true });

// One review per completed appointment
ReviewSchema.index({ patient: 1, appointment: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema);
