// pages/api/auth/login.js
import { connectDB } from "../../../lib/db";
import User from "../../../models/User";
import Doctor from "../../../models/Doctor";
import jwt from "jsonwebtoken";

export default async function handler(req,res){
  await connectDB();
  const { email, password, role } = req.body;

  const Model = role === "doctor" ? Doctor : User;
  const user = await Model.findOne({ email });
  if(!user) return res.status(400).json({ error: "Invalid credentials" });

  const isMatch = await user.comparePassword(password);
  if(!isMatch) return res.status(400).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.setHeader("Set-Cookie", `token=${token}; HttpOnly; Path=/; Max-Age=${7*24*60*60}`);
  res.status(200).json({ message: "Logged in", user });
}
