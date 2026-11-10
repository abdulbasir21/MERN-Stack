import { describe, it, expect } from 'vitest';
import { validateUploadedDocumentFile } from '../../src/lib/fileValidation.js';

describe('Phase 1 — Upload File Validation Helper (SEC-5 / DOC-2)', () => {
  const validPdfBuffer = Buffer.from('%PDF-1.7\nMock PDF content');
  const validDocxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);

  it('accepts a valid PDF file matching extension, MIME type, size, and signature', () => {
    const format = validateUploadedDocumentFile({
      originalName: 'resume.pdf',
      mimeType: 'application/pdf',
      sizeBytes: validPdfBuffer.length,
      buffer: validPdfBuffer,
    });
    expect(format).toBe('PDF');
  });

  it('accepts a valid DOCX file matching extension, MIME type, size, and signature', () => {
    const format = validateUploadedDocumentFile({
      originalName: 'resume.docx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sizeBytes: validDocxBuffer.length,
      buffer: validDocxBuffer,
    });
    expect(format).toBe('DOCX');
  });

  it('rejects files larger than 5 MB with 400 INVALID_FILE', () => {
    expect(() =>
      validateUploadedDocumentFile({
        originalName: 'large.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 5 * 1024 * 1024 + 1,
        buffer: validPdfBuffer,
      })
    ).toThrow(/maximum allowed size of 5 MB/);
  });

  it('rejects files with spoofed extension or mismatched magic signature', () => {
    expect(() =>
      validateUploadedDocumentFile({
        originalName: 'spoof.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 16,
        buffer: Buffer.from('NOT_A_PDF_HEADER'),
      })
    ).toThrow(/signature does not match/);
  });
});
