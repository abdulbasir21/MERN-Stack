// middleware/errorMiddleware.js

 const errorMiddleware = (err, req, res, next) => {
  console.error("Server Error:", err.message);

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

module.exports=errorMiddleware; 