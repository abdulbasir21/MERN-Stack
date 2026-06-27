import e from "express";
import jwt from "jsonwebtoken";

const userAuth = async (req, res, next) => {
  // ✅ Get token from cookie named 'token'
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    // ✅ Verify the token using your secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Attach user ID to request for next middlewares/controllers
    req.userId = decoded.userId;

    next();
  } catch (error) {
    return res.status(401).json({ message: error.message });
  }
};

export default userAuth;

