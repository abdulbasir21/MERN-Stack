import multer from 'multer';
import path from 'node:path';
import { config } from '../config/env.js';
import { AppError } from './errorHandler.js';
import { ERROR_CODES } from '../config/constants.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxUploadMb * 1024 * 1024
  }
});

export function verifyMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) {
    return null;
  }
  // PDF: %PDF (0x25 0x50 0x44 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'pdf';
  }
  // DOCX (ZIP archive): PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return 'docx';
  }
  return null;
}

/**
 * Middleware handling multipart single file upload with extension, MIME, and magic-byte validation
 */
export function documentUploadMiddleware(fieldName = 'file') {
  const single = upload.single(fieldName);

  return (req, res, next) => {
    single(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new AppError(
              ERROR_CODES.PAYLOAD_TOO_LARGE,
              `File exceeds maximum upload limit of ${config.maxUploadMb}MB`,
              413
            )
          );
        }
        return next(new AppError(ERROR_CODES.VALIDATION_ERROR, err.message, 400));
      }

      if (!req.file) {
        return next(new AppError(ERROR_CODES.VALIDATION_ERROR, 'Document file is required', 400));
      }

      const file = req.file;
      const ext = path.extname(file.originalname).toLowerCase();

      // BR-D1: Validate extension
      if (!['.pdf', '.docx'].includes(ext)) {
        return next(
          new AppError(
            ERROR_CODES.UNSUPPORTED_FILE,
            'Unsupported file type. Only PDF and DOCX files are permitted.',
            400
          )
        );
      }

      // BR-D1: Validate MIME
      const allowedMimes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/octet-stream'
      ];
      if (!allowedMimes.includes(file.mimetype)) {
        return next(
          new AppError(
            ERROR_CODES.UNSUPPORTED_FILE,
            'Invalid MIME type. Only PDF and DOCX files are permitted.',
            400
          )
        );
      }

      // BR-D1: Validate Magic Bytes / File Signature
      const detectedType = verifyMagicBytes(file.buffer);
      if (!detectedType) {
        return next(
          new AppError(
            ERROR_CODES.UNSUPPORTED_FILE,
            'Corrupt file signature or unsupported binary format.',
            400
          )
        );
      }

      if (ext === '.pdf' && detectedType !== 'pdf') {
        return next(
          new AppError(
            ERROR_CODES.UNSUPPORTED_FILE,
            'File extension does not match binary PDF signature.',
            400
          )
        );
      }

      if (ext === '.docx' && detectedType !== 'docx') {
        return next(
          new AppError(
            ERROR_CODES.UNSUPPORTED_FILE,
            'File extension does not match binary DOCX signature.',
            400
          )
        );
      }

      next();
    });
  };
}
