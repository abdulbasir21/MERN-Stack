const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

// CORS first
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

// Body parser & cookie parser
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/v1/user", require("./routes/userRoutes"));
app.use("/api/v1/blog", require("./routes/blogRoutes"));

// Error middleware
app.use(require("./middlewares/errorMiddleware"));

// Root
app.get("/", (req, res) => {
  res.send("<h1>Welcome to Blog API</h1>");
});

// Listen
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
