import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../lib/errors.js';
import { getTranscriptionService } from '../../services/voice/transcriptionService.js';
import { getSpeechService } from '../../services/voice/speechService.js';
import {
  validateAudioUpload,
  isEmptyAnswer,
  SynthesizeSpeechInputSchema,
  type TranscribeAudioResponse,
  type SynthesizeSpeechResponse,
} from '@interviewpilot/shared';

export async function transcribeAudioHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const file = req.file;
  if (!file) {
    next(new AppError('VALIDATION_ERROR', 'No audio file uploaded.', 400));
    return;
  }

  // VOI-2: Validate size and MIME type
  const validation = validateAudioUpload({
    mimeType: file.mimetype,
    sizeBytes: file.size,
  });

  if (!validation.valid) {
    next(new AppError('VALIDATION_ERROR', validation.error || 'Invalid audio file.', 400));
    return;
  }

  const userId = req.actor!.id;
  const interviewId = (req.body.interviewId as string) || undefined;
  const durationSeconds = parseFloat((req.body.durationSeconds as string) || '0') || 0;
  const isSilenceOnly = req.body.isSilenceOnly === 'true' || req.body.isSilenceOnly === true;

  try {
    // VOI-3 & VOI-5: Transcribe audio buffer through Gemini service (no file persisted)
    const transcriptionResult = await getTranscriptionService().transcribeAudio({
      audioBuffer: file.buffer,
      mimeType: file.mimetype,
      userId,
      interviewId,
    });

    const transcript = transcriptionResult.transcript;

    // VOI-4: Empty answer detection (< 1s, < 2 words, or silence only)
    const empty = isEmptyAnswer({
      durationSeconds,
      transcript,
      isSilenceOnly,
    });

    const responsePayload: TranscribeAudioResponse = {
      transcript,
      isEmpty: empty,
      durationSeconds,
    };

    res.status(200).json({
      data: responsePayload,
    });
  } catch (err) {
    next(err);
  } finally {
    // VOI-3: Explicitly discard buffer reference
    file.buffer = Buffer.alloc(0);
  }
}

export async function synthesizeSpeechHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const parsed = SynthesizeSpeechInputSchema.safeParse(req.body);
  if (!parsed.success) {
    next(new AppError('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid speech input', 400));
    return;
  }

  const userId = req.actor!.id;
  const interviewId = (req.body.interviewId as string) || undefined;

  try {
    const result = await getSpeechService().synthesizeSpeech({
      text: parsed.data.text,
      voice: parsed.data.voice,
      userId,
      interviewId,
    });

    const responsePayload: SynthesizeSpeechResponse = {
      audioBase64: result.audioBase64,
      mimeType: result.mimeType,
      caption: result.caption,
    };

    res.status(200).json({
      data: responsePayload,
    });
  } catch (err) {
    next(err);
  }
}
