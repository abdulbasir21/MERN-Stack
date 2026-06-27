import express from "express";
import cors from "cors";
import 'dotenv/config';
import mongodb from "./config/mongodb.js";
import cookieParser from "cookie-parser";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";


const app = express();
const port = process.env.PORT || 4000

mongodb();

const allowedOrigins = 'http://localhost:5173'
app.use(express.json());

app.use(cookieParser());
app.use(cors({credentials: true, origin: allowedOrigins}))

app.get("/", (req, res) => {
    res.send("API is running....");
});

//Api endpoints
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);

app.listen(port, () => console.log(`Server started on PORT:${port}`)
);