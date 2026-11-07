import { User, IUser } from '../../models/User';
import { hashPassword, comparePassword, generateToken } from '../../utils/auth';
import { AppError } from '../../utils/AppError';
import { RegisterCustomerInput, LoginInput, UpdateUserInput } from './auth.schema';

export class AuthService {
  static async registerCustomer(input: RegisterCustomerInput) {
    const normalizedEmail = input.email.toLowerCase().trim();

    // Check if user already exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      throw new AppError(
        409,
        'CONFLICT',
        'An account with this email address already exists.',
        [{ field: 'email', message: 'Email is already registered' }]
      );
    }

    const passwordHash = await hashPassword(input.password);

    const user = await User.create({
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'customer',
      phone: input.phone?.trim(),
      status: 'active',
      isSeedData: false,
    });

    const token = generateToken({
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      token,
    };
  }

  static async login(input: LoginInput) {
    const normalizedEmail = input.email.toLowerCase().trim();

    // Query user including passwordHash
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    if (!user) {
      // Generic message to prevent user enumeration
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid email or password.');
    }

    const isMatch = await comparePassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid email or password.');
    }

    if (user.status === 'blocked') {
      throw new AppError(403, 'ACCOUNT_BLOCKED', 'Your account has been permanently suspended.');
    }

    // Update lastLoginAt asynchronously
    User.updateOne({ _id: user._id }, { lastLoginAt: new Date() }).exec();

    const token = generateToken({
      sub: user._id.toString(),
      role: user.role,
      companyId: user.companyId?.toString(),
      email: user.email,
    });

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        companyId: user.companyId ? user.companyId.toString() : undefined,
      },
      token,
    };
  }

  static async getMe(user: IUser) {
    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        companyId: user.companyId ? user.companyId.toString() : undefined,
        status: user.status,
      },
    };
  }

  static async updateMe(userId: string, input: UpdateUserInput) {
    const updates: Partial<IUser> = {};
    if (input.name) updates.name = input.name.trim();
    if (input.phone) updates.phone = input.phone.trim();

    const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found.');
    }

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    };
  }
}
