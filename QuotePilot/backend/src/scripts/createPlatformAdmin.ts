import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/User';
import { hashPassword } from '../utils/auth';

export const createPlatformAdmin = async () => {
  const adminEmail = env.PLATFORM_ADMIN_EMAIL.toLowerCase().trim();
  const existing = await User.findOne({ email: adminEmail });

  if (existing) {
    console.log(`[Platform Admin] Admin user already exists (${adminEmail}). Updating password & role...`);
    existing.passwordHash = await hashPassword(env.PLATFORM_ADMIN_PASSWORD);
    existing.role = 'platform_admin';
    existing.status = 'active';
    await existing.save();
    console.log('[Platform Admin] ✅ Admin updated successfully.');
    return existing;
  }

  const passwordHash = await hashPassword(env.PLATFORM_ADMIN_PASSWORD);
  const admin = await User.create({
    name: 'Platform Administrator',
    email: adminEmail,
    passwordHash,
    role: 'platform_admin',
    status: 'active',
    isSeedData: true,
  });

  console.log(`[Platform Admin] ✅ Platform admin created: ${adminEmail}`);
  return admin;
};

// Direct script execution
if (require.main === module) {
  mongoose
    .connect(env.MONGOURL)
    .then(async () => {
      await createPlatformAdmin();
      await mongoose.connection.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Platform Admin] Error:', err);
      process.exit(1);
    });
}
