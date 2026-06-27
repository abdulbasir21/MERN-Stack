const userModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const { token } = require("morgan");
const jwt =require( "jsonwebtoken");
require("dotenv").config();




// ================= Register User =================
exports.registerController = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill all fields",
      });
    }

    // existing user check
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(401).json({
        success: false,
        message: "User already exists",
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // save new user
    const newUser = new userModel({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: "New user created successfully",
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("Register Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error in Register Controller",
      error: error.message,
    });
  }
};


// ================= Login User =================
// Login
exports.loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await userModel.findOne({ email });
    if (!user) return res.status(401).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: { _id: user._id, username: user.username, email: user.email },
      
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Login error", error });
  }
};










//Logout 



exports.logout = (req, res) => {
  const isDev = process.env.NODE_ENV === "development";

  res.clearCookie("token", {
    httpOnly: true,
    sameSite: isDev ? "lax" : "none",
    secure: !isDev,
  });

  res.status(200).json({ success: true, message: "Logged out successfully" });
};


// ================= Get All Users =================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find({});
    return res.status(200).json({
      success: true,
      message: "All users data",
      userCount: users.length,
      users,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in Get All Users",
      error,
    });
  }
};
