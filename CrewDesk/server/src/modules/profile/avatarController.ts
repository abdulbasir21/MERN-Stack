import { Request, Response, NextFunction } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import { prisma } from '../../lib/prisma.js';
import { uploadToImageKit, deleteFromImageKit } from '../../lib/imagekit.js';
import { logAudit } from '../../lib/audit.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export class AvatarController {
  async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      if (!req.file) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'No image file uploaded.' },
        });
      }

      // 1. Verify REAL file content type from buffer (never trust extension)
      const detected = await fileTypeFromBuffer(req.file.buffer);
      if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Invalid file type. Only real JPEG, PNG, and WebP images are allowed.',
          },
        });
      }

      // 2. Fetch current user to track old avatar
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarFileId: true, avatarUrl: true },
      });

      if (!user) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'User not found.' },
        });
      }

      const oldFileId = user.avatarFileId;
      const fileName = `avatar_${userId}_${Date.now()}.${detected.ext}`;

      // 3. Upload to ImageKit
      const uploaded = await uploadToImageKit(req.file.buffer, fileName);

      // 4. Update database
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          avatarUrl: uploaded.url,
          avatarFileId: uploaded.fileId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      });

      // 5. Delete old ImageKit file on replace
      if (oldFileId) {
        await deleteFromImageKit(oldFileId);
      }

      await logAudit(userId, 'avatar:update', 'User', userId);

      return res.status(200).json({
        data: {
          user: updatedUser,
          message: 'Avatar uploaded successfully.',
        },
      });
    } catch (err) {
      return next(err);
    }
  }

  async removeAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarFileId: true },
      });

      if (!user) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'User not found.' },
        });
      }

      if (user.avatarFileId) {
        await deleteFromImageKit(user.avatarFileId);
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          avatarUrl: null,
          avatarFileId: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      });

      await logAudit(userId, 'avatar:remove', 'User', userId);

      return res.status(200).json({
        data: {
          user: updatedUser,
          message: 'Avatar removed successfully.',
        },
      });
    } catch (err) {
      return next(err);
    }
  }
}

export const avatarController = new AvatarController();
