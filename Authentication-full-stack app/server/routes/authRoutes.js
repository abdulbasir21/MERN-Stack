import express from 'express';
const authRouter = express.Router();
import { login, register, logout, sendVerifyOtp, verifyEmail, isAuthenticated ,sendResetOtp, resetPassword,verifyResetOtp} from '../controllers/authController.js';
import  userAuth  from '../middleware/userAuth.js';
import { registerSchema,loginSchema } from '../validation/authValidation.js';
import {validate} from '../middleware/validate.js';


authRouter.post('/login',validate(loginSchema), login);
authRouter.post('/register', validate(registerSchema), register);
authRouter.post('/logout', logout);
authRouter.post('/send-Verify-Otp', userAuth, sendVerifyOtp);
authRouter.post('/Verify-account', userAuth, verifyEmail);
authRouter.get('/is-auth', userAuth, isAuthenticated);
authRouter.post('/send-reset-otp', sendResetOtp);
authRouter.post("/verify-reset-otp", verifyResetOtp);

authRouter.post('/reset-password', resetPassword);

export default authRouter;