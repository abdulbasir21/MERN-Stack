import bcrypt from 'bcrypt';
import type {
  AuthUserDto,
  DeleteAccountInput,
  OnboardingInput,
  PrivacyControl,
  UpdateProfileInput,
} from '@interviewpilot/shared';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/errors.js';
import { toAuthUserDto } from '../auth/authService.js';
import { runUserStorageCleanup } from '../../services/storage/storageCleanupHook.js';

export const MVP_PRIVACY_CONTROLS: readonly PrivacyControl[] = Object.freeze([
  'DELETE_INTERVIEW',
  'DELETE_DOCUMENT',
  'DELETE_ACCOUNT',
]);

export async function completeUserOnboarding(
  actorUserId: string,
  input: OnboardingInput
): Promise<AuthUserDto> {
  const now = new Date();

  const updated = await prisma.user.update({
    where: { id: actorUserId },
    data: {
      profile: {
        upsert: {
          create: {
            fullName: input.fullName.trim(),
            statusType: input.statusType ?? null,
            experienceLevel: input.experienceLevel ?? null,
            targetRole: input.targetRole?.trim() || null,
            careerGoals: input.careerGoals?.trim() || null,
            preferredCategories: input.preferredCategories ?? [],
            onboardingCompletedAt: now,
          },
          update: {
            fullName: input.fullName.trim(),
            statusType: input.statusType ?? null,
            experienceLevel: input.experienceLevel ?? null,
            targetRole: input.targetRole?.trim() || null,
            careerGoals: input.careerGoals?.trim() || null,
            preferredCategories: input.preferredCategories ?? [],
            onboardingCompletedAt: now,
          },
        },
      },
    },
    include: { profile: true },
  });

  return toAuthUserDto(updated);
}

export async function skipUserOnboarding(actorUserId: string): Promise<AuthUserDto> {
  const now = new Date();

  const updated = await prisma.user.update({
    where: { id: actorUserId },
    data: {
      profile: {
        upsert: {
          create: {
            preferredCategories: [],
            onboardingCompletedAt: now,
          },
          update: {
            onboardingCompletedAt: now,
          },
        },
      },
    },
    include: { profile: true },
  });

  return toAuthUserDto(updated);
}

/**
 * USR-2: Always reads/updates profile using actorUserId from the authenticated session,
 * ignoring any id or userId fields supplied in the request body.
 */
export async function updateOwnProfile(
  actorUserId: string,
  input: UpdateProfileInput
): Promise<AuthUserDto> {
  const updated = await prisma.user.update({
    where: { id: actorUserId },
    data: {
      profile: {
        upsert: {
          create: {
            fullName: input.fullName.trim(),
            statusType: input.statusType ?? null,
            experienceLevel: input.experienceLevel ?? null,
            targetRole: input.targetRole?.trim() || null,
            careerGoals: input.careerGoals?.trim() || null,
            preferredCategories: input.preferredCategories ?? [],
            onboardingCompletedAt: new Date(),
          },
          update: {
            fullName: input.fullName.trim(),
            ...(input.statusType !== undefined ? { statusType: input.statusType } : {}),
            ...(input.experienceLevel !== undefined
              ? { experienceLevel: input.experienceLevel }
              : {}),
            ...(input.targetRole !== undefined
              ? { targetRole: input.targetRole?.trim() || null }
              : {}),
            ...(input.careerGoals !== undefined
              ? { careerGoals: input.careerGoals?.trim() || null }
              : {}),
            ...(input.preferredCategories !== undefined
              ? { preferredCategories: input.preferredCategories }
              : {}),
          },
        },
      },
    },
    include: { profile: true },
  });

  return toAuthUserDto(updated);
}

export async function getScopedUserProfile(
  actorUserId: string,
  requestedUserId: string
): Promise<AuthUserDto> {
  // Permission matrix §5: Another user's resource returns 404, not 403.
  if (actorUserId !== requestedUserId) {
    throw new AppError('NOT_FOUND', 'User profile not found.', 404);
  }

  const user = await prisma.user.findUnique({
    where: { id: actorUserId },
    include: { profile: true },
  });

  if (!user) {
    throw new AppError('NOT_FOUND', 'User profile not found.', 404);
  }

  return toAuthUserDto(user);
}

/**
 * USR-3 & MASTER_PROMPT §9 item 10:
 * (1) Verify password and mark user DELETING (login blocked immediately).
 * (2) Run storage cleanup hook (if this fails, user stays DELETING and can retry).
 * (3) Hard-delete user (all owned rows cascade; AdminAuditLog rows remain intact).
 */
export async function deleteOwnUserAccount(
  actorUserId: string,
  input: DeleteAccountInput
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: actorUserId },
  });

  if (!user) {
    throw new AppError('NOT_FOUND', 'Account not found.', 404);
  }

  if (user.isDemo) {
    throw new AppError(
      'DEMO_RESTRICTED',
      'Demo visitors cannot delete accounts.',
      403
    );
  }

  if (user.role === 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Admin accounts cannot be deleted.', 403);
  }

  if (!user.passwordHash) {
    throw new AppError('FORBIDDEN', 'Account password verification failed.', 403);
  }

  const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordValid) {
    throw new AppError('UNAUTHENTICATED', 'Current password is incorrect.', 401);
  }

  // Step 1 (Transaction): Mark user DELETING so login and normal sessions are blocked
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: actorUserId },
      data: {
        status: 'DELETING',
      },
    });
  });

  // Step 2: Storage cleanup (outside DB transaction; if it fails, user stays DELETING)
  try {
    await runUserStorageCleanup(actorUserId);
  } catch {
    throw new AppError(
      'INTERNAL_ERROR',
      'Storage cleanup failed while deleting account. Your account is locked and deletion can be retried.',
      502
    );
  }

  // Step 3 (Transaction): Hard-delete user; all user-owned rows cascade
  await prisma.$transaction(async (tx) => {
    await tx.user.delete({
      where: { id: actorUserId },
    });
  });
}
