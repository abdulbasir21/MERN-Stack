import path from 'node:path';
import { MAX_DOCUMENT_SIZE_BYTES } from '../config/constants.js';
import { AppError } from './errors.js';

export type SupportedDocumentFormat = 'PDF' | 'DOCX';

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
const DOCX_ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // "PK\x03\x04"

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx']);
const ALLOWED_MIMES: Record<string, SupportedDocumentFormat> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
};

export interface FileValidationInput {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
}

/**
 * SEC-5 / DOC-2 helper: validates file extension, MIME type, size (<= 5 MB),
 * and binary file signature (magic bytes).
 */
export function validateUploadedDocumentFile(
  input: FileValidationInput
): SupportedDocumentFormat {
  if (!input.originalName || input.sizeBytes <= 0 || input.buffer.length === 0) {
    throw new AppError('INVALID_FILE', 'Uploaded file is empty or missing.', 400);
  }

  if (
    input.sizeBytes > MAX_DOCUMENT_SIZE_BYTES ||
    input.buffer.length > MAX_DOCUMENT_SIZE_BYTES
  ) {
    throw new AppError(
      'INVALID_FILE',
      'File exceeds the maximum allowed size of 5 MB.',
      400
    );
  }

  const ext = path.extname(input.originalName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new AppError(
      'INVALID_FILE',
      'Only PDF and DOCX files are allowed.',
      400
    );
  }

  const formatFromMime = ALLOWED_MIMES[input.mimeType.toLowerCase()];
  if (!formatFromMime) {
    throw new AppError(
      'INVALID_FILE',
      'Invalid MIME type. Only PDF and DOCX files are allowed.',
      400
    );
  }

  if (formatFromMime === 'PDF') {
    if (ext !== '.pdf') {
      throw new AppError('INVALID_FILE', 'File extension does not match MIME type.', 400);
    }
    if (
      input.buffer.length < PDF_MAGIC.length ||
      !input.buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)
    ) {
      throw new AppError(
        'INVALID_FILE',
        'File signature does not match a valid PDF document.',
        400
      );
    }
    return 'PDF';
  }

  if (ext !== '.docx') {
    throw new AppError('INVALID_FILE', 'File extension does not match MIME type.', 400);
  }
  if (
    input.buffer.length < DOCX_ZIP_MAGIC.length ||
    !input.buffer.subarray(0, DOCX_ZIP_MAGIC.length).equals(DOCX_ZIP_MAGIC)
  ) {
    throw new AppError(
      'INVALID_FILE',
      'File signature does not match a valid DOCX document.',
      400
    );
  }

  return 'DOCX';
}
