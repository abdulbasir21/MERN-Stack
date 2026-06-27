import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const AvailabilitySlotSchema = new mongoose.Schema({
  day: { type: String, enum: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"], required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  slotDurationMinutes: { type: Number, default: 30 },
}, { _id: false });

const DoctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  experience: { type: Number, required: true },
  description: String,
  image: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "doctor" },
  // Extra registration fields
  phone: { type: String },
  licenseNumber: { type: String },
  clinicDetails: { type: String },
  // Admin approval
  isApproved: { type: Boolean, default: false },
  isRejected: { type: Boolean, default: false },
  // Availability slots
  availability: [AvailabilitySlotSchema],
  
  // Refresh token
  refreshToken: { type: String, default: null },
}, { timestamps: true });

DoctorSchema.pre("save", async function(next){
  if(!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

DoctorSchema.methods.comparePassword = function(password){
  return bcrypt.compare(password, this.password);
};

export default mongoose.models.Doctor || mongoose.model("Doctor", DoctorSchema);
