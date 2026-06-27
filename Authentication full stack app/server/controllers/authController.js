import userModel from "../model/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import transporter from "../config/nodemailer.js";
import { verify_Email_Template } from "../config/emailTemplate.js";

//Register controller
export const  register= async(req,res)=>{
    const {name,email,password}=req.body;

    if(!name || !email || !password){
        return res.status(400).json({
            success:false,
            message:"Please provide all required fields"
        });
    }
    const existinguser= await userModel.findOne({email});
    if(existinguser){
        return res.status(400).json({
            success:false,
            message:"User already exists"
        });
    }
    try {
        const hashedPassword= await bcrypt.hash(password,10);
        const user=await userModel.create({name,email,password:hashedPassword});
        await user.save();


        //Generate JWT Token
        const token=jwt.sign(
            {userId:user._id},
            process.env.JWT_SECRET,
            {expiresIn:'7d'}
        );

       

     // Set a cookie named "token" with the value stored in variable 'token'
res.cookie("token", token, {

    // Makes the cookie accessible only by the server (not JavaScript in the browser) — helps prevent XSS attacks
    httpOnly: true,

    // Ensures the cookie is sent only over HTTPS when in production (for security)
    secure: process.env.NODE_ENV === "production",

    // Controls cross-site cookie behavior:
    //  - "none" in production allows cross-origin requests (e.g., frontend and backend on different domains)
    //  - "strict" in development allows cookies only from same-site requests
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",

    // Sets the cookie to expire in 7 days (in milliseconds)
    maxAge: 7 * 24 * 60 * 60 * 1000
});


return res.status(201).json({
  success: true,
  message: "User registered successfully",
  token
});

    } catch (error) {
        res.status(500).json({
            success:false,
            message:error.message
        });
    }
}  


//Login controller

export const login = async (req, res) => {
  const { email, password } = req.body;

  // 1️⃣ Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  try {
    // 2️⃣ Find user
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not exist",
      });
    }

    // 3️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Password is incorrect",
      });
    }

    // 4️⃣ Create token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5️⃣ Send cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 6️⃣ Send response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



//Logout controller
export const logout=async(req,res)=>{
    res.clearCookie("token",{
        httpOnly:true,  
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 0
    });
    return res.json({
        success:true,
        message:"Logged out successfully"
    });
}

//send verify otp to user email
export const sendVerifyOtp = async (req, res) => {
  try {
    const userId = req.userId; // ✅ get userId from middleware

    // 🟡 Add debug logs
    console.log("Decoded userId:", userId);

    const user = await userModel.findById(userId);

    console.log("User found:", user);

    // ✅ Check if user exists before accessing properties
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isAccountVerified) {
      return res.status(400).json({
        success: false,
        message: "User already verified",
      });
    }

    // ✅ Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    user. verifyOTP = otp;
    user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;
    await user.save();
    console.log("OTP saved in DB:", user.verifyOTP);



    // ✅ Send OTP email
    const emailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Verify your email",
       html: verify_Email_Template
          .replace(/{otp}/g, otp)       // replace all {otp} placeholders
          .replace(/{email}/g, user.email) // replace all {email} placeholders
          .replace(/{name}/g, user.name) // replace all {name} placeholders
    };
    await transporter.sendMail(emailOptions);

    return res.status(200).json({
      success: true,
      message: "OTP sent to email",
    });
  } catch (error) {
    console.error("sendVerifyOtp error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//verify user account using otp
export const verifyEmail = async (req, res) => {
  try {
  

    const {  otp } = req.body;
    const userId = req.userId;

    // ✅ Basic validation
    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: "User ID and OTP are required",
      });
    }

    // ✅ Try to find the user
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ✅ Verify OTP correctness
    if (user. verifyOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // ✅ Check expiry
    if (user.verifyOtpExpireAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    // ✅ Mark account as verified
    user.isAccountVerified = true;
    user.verifyOTP = "";
    user.verifyOtpExpireAt = 0;
    await user.save();

  



    return res.status(200).json({
      success: true,
      message: "Account verified successfully",
    });
  } catch (error) {
    console.error("verifyEmail error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


//Check if the user is authenticated
export const isAuthenticated=async(req,res)=>{
    try {
      return res.json ({
        success:true
      });
    }
    catch (error) {
        return res.status(500).json({
            success:false,
            message:error.message
        });
    }
  }

 // send password reset otp to user email
export const sendResetOtp = async (req, res) => {
  const { email } = req.body;

  // ✅ Validate input
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  try {
    // ✅ Find user by email
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(200).json({
        success: false,
        message: "User not found",
      });
    }

    // ✅ Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();
    console.log("OTP saved in DB:", user.resetOtp);

    // ✅ Send OTP email
    const emailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Password reset OTP",
      text: `Your password reset code is ${otp}. It will expire in 15 minutes.`,
    };

    await transporter.sendMail(emailOptions);

    return res.status(200).json({
      success: true,
      message: "OTP sent to email",
    });
  } catch (error) {
    console.error("sendResetOtp error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




//Verify reset otp

export const verifyResetOtp = async (req, res) => {
  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json({
      success: false,
      message: "OTP is required",
    });
  }

  try {
    // 1️⃣ Find user by OTP
    const user = await userModel.findOne({ resetOtp: otp });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // 2️⃣ Check OTP expiry
    if (user.resetOtpExpireAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    // 3️⃣ OTP is valid
    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      email: user.email, // optional, helps frontend know which email belongs to this OTP
    });

  } catch (error) {
    console.error("verifyResetOtp error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//Reset your password

export const resetPassword = async (req, res) => {      
  const { email, newPassword } = req.body;

  // 🧱 1️⃣ Validate input
  if (!email || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Email and new password are required",
    });
  }

  try {
    // 2️⃣ Find user
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 3️⃣ Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // 4️⃣ Clear OTP so it can't be reused
    user.resetOtp = "";
    user.resetOtpExpireAt = 0;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });

  } catch (error) {
    console.error("resetPassword error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// //Reset your password using otp
// export const resetPassword = async (req, res) => {      
//   const { email, otp, newPassword } = req.body;
//   if (!email || !otp || !newPassword) {
//     return res.status(400).json({
//       success: false,
//       message: "Email, OTP, and new password are required",
//     });
//   }
//   try {
//     const user = await userModel.findOne({ email });
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }
//     if (user.resetOtp === "" || user.resetOtp !== otp) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid OTP.",
//       });
//     }

//     // ✅ Verify OTP correctness
//     if (user.resetOtp !== otp) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid OTP",
//       });
//     }

//     // ✅ Check expiry
//     if (user.resetOtpExpireAt < Date.now()) {
//       return res.status(400).json({
//         success: false,
//         message: "OTP expired",
//       });
//     }

//     // ✅ Update password
//     const hashedPassword = await bcrypt.hash(newPassword, 10);
//     user.password = hashedPassword;
//     user.resetOtp = "";
//     user.resetOtpExpireAt = 0;
//     await user.save();

//     return res.status(200).json({
//       success: true,
//       message: "Password reset successfully",
//     });
//   } catch (error) {
//     console.error("resetPassword error:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
