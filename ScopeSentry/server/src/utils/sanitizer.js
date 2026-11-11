import path from 'node:path';

/**
 * BR-D6: Sanitize original filename for display and metadata storage.
 * Strips path traversals, HTML/script tags, and control characters.
 */
export function sanitizeFilename(rawName) {
  if (typeof rawName !== 'string' || !rawName.trim()) {
    return 'document.pdf';
  }

  // Extract basename to eliminate path traversals
  let basename = path.basename(rawName.trim());

  // Remove any remaining path delimiters
  basename = basename.replace(/[/\\?%*:|"<>]/g, '_');

  // Strip HTML / script tags
  basename = basename.replace(/<[^>]*>/g, '');

  // Strip control / non-printable characters
  // eslint-disable-next-line no-control-regex
  basename = basename.replace(/[\x00-\x1F\x7F]/g, '');

  // Remove leading dots to prevent hidden files or traversal tricks
  basename = basename.replace(/^\.+/, '');

  if (!basename) {
    return 'document.pdf';
  }

  // Ensure reasonable length (max 120 chars) while preserving extension
  if (basename.length > 120) {
    const ext = path.extname(basename);
    const stem = path.basename(basename, ext);
    basename = `${stem.slice(0, 120 - ext.length)}${ext}`;
  }

  return basename;
}
