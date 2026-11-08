import multer from 'multer';

// Use memory storage so we can validate real content-type from buffer before uploading
const storage = multer.memoryStorage();

export const avatarUpload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB limit
  },
});
