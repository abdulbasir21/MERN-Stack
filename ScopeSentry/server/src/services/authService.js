import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateSessionToken, generateRandomToken, hashToken } from '../utils/tokens.js';
import { sendPasswordResetEmail } from '../integrations/email.js';
import { AppError } from '../middleware/errorHandler.js';
import { ERROR_CODES } from '../config/constants.js';

export async function registerUser({ email, password, name }) {
  const normalizedEmail = (email || '').trim().toLowerCase();

  // BR-A1: Check if email exists; generic validation error
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      'Registration could not be completed with the provided information',
      400,
      [{ field: 'email', message: 'Email cannot be registered' }]
    );
  }

  // BR-A2: Password hash with bcrypt >= 12
  const passwordHash = await hashPassword(password);

  const newUser = await User.create({
    email: normalizedEmail,
    passwordHash,
    name: name.trim(),
    role: 'user',
    tokenVersion: 0
  });

  const sessionToken = generateSessionToken(newUser);

  return {
    user: {
      id: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      createdAt: newUser.createdAt
    },
    sessionToken
  };
}

export async function loginUser({ email, password }) {
  const normalizedEmail = (email || '').trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  // BR-A4: Identical message for unknown email and wrong password
  if (!user) {
    throw new AppError(ERROR_CODES.UNAUTHENTICATED, 'Invalid email or password', 401);
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError(ERROR_CODES.UNAUTHENTICATED, 'Invalid email or password', 401);
  }

  const sessionToken = generateSessionToken(user);

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    },
    sessionToken
  };
}

export async function requestPasswordReset(email) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  // BR-A5: Always returns the same message whether email exists or not
  const standardMessage = 'If this email is registered, you will receive password reset instructions.';

  if (!user) {
    return { message: standardMessage };
  }

  // 30 minute expiry
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const plainToken = generateRandomToken();
  const tokenHash = hashToken(plainToken);

  await PasswordResetToken.create({
    userId: user._id,
    tokenHash,
    expiresAt,
    usedAt: null
  });

  await sendPasswordResetEmail(user.email, plainToken);

  return { message: standardMessage };
}

export async function resetPassword({ token, newPassword }) {
  if (!token || !newPassword) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Token and new password are required', 400);
  }

  const tokenHash = hashToken(token);

  const resetRecord = await PasswordResetToken.findOne({
    tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() }
  });

  if (!resetRecord) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid or expired password reset token', 400);
  }

  const user = await User.findById(resetRecord.userId);
  if (!user) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Associated user account not found', 404);
  }

  const newHash = await hashPassword(newPassword);

  // BR-A5 & Section 8 Transaction #7: Password reset in transaction
  const session = await mongoose.startSession().catch(() => null);

  if (session) {
    try {
      await session.withTransaction(async () => {
        resetRecord.usedAt = new Date();
        await resetRecord.save({ session });

        user.passwordHash = newHash;
        user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all existing sessions
        await user.save({ session });
      });
    } finally {
      session.endSession();
    }
  } else {
    // Non-replica set fallback
    resetRecord.usedAt = new Date();
    await resetRecord.save();
    user.passwordHash = newHash;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
  }

  return { message: 'Password has been successfully reset. Please log in with your new password.' };
}

export async function getUserProfile(userId) {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'User not found', 404);
  }
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt
  };
}

export async function updateUserSettings(userId, { name, currentPassword, newPassword }) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'User not found', 404);
  }

  if (name) {
    user.name = name.trim();
  }

  if (newPassword) {
    if (!currentPassword) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Current password is required to set a new password', 400);
    }
    const isCurrentMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isCurrentMatch) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Current password does not match', 400);
    }
    user.passwordHash = await hashPassword(newPassword);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
  }

  await user.save();

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt
  };
}
