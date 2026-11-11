import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.js';
import { csrfMiddleware } from '../../middleware/csrf.js';
import { MAX_AUDIO_UPLOAD_BYTES } from '@interviewpilot/shared';
import {
  transcribeAudioHandler,
  synthesizeSpeechHandler,
} from './voiceController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AUDIO_UPLOAD_BYTES, // 5 MB
    files: 1,
  },
});

export const voiceRouter = Router();

// Both voice endpoints require authentication and CSRF protection
voiceRouter.use(authenticate);
voiceRouter.use(csrfMiddleware);

voiceRouter.post('/transcribe', upload.single('audio'), transcribeAudioHandler);
voiceRouter.post('/synthesize', synthesizeSpeechHandler);
