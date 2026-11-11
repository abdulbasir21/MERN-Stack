import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 12;

export async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(plainPassword, passwordHash) {
  if (!plainPassword || !passwordHash) {
    return false;
  }
  return bcrypt.compare(plainPassword, passwordHash);
}
