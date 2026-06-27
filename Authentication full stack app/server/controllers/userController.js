import userModel from "../model/userModel.js";

export const getUserData = async (req, res) => {
  try {
    const userId = req.userId; // userId is set in req by userAuth middleware
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    return res.status(200).json({
      success: true,
      userData:{
        name: user.name,
        isAccountVerified: user.isAccountVerified,
      }
    });
  } catch (error) {
    console.error("getUserData error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
