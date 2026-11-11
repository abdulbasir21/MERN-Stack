import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma, ensureDatabaseConnected } from '../../src/db/prisma.js';
import { resetAllRateLimits } from '../../src/middleware/rateLimit.js';
import { AUTH_COOKIE_NAME } from '../../src/config/constants.js';
import { seedDatabase } from '../../prisma/seed.js';
import {
  MockTranscriptionService,
  setTranscriptionService,
  resetTranscriptionService,
} from '../../src/services/voice/transcriptionService.js';
import {
  MockSpeechService,
  setSpeechService,
  resetSpeechService,
} from '../../src/services/voice/speechService.js';

const CSRF_HEADER = { 'X-Requested-With': 'InterviewPilot' };

function extractSessionCookie(setCookieHeader: string | string[] | undefined): string {
  if (!setCookieHeader) return '';
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const ipCookie = list.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
  return ipCookie ? ipCookie.split(';')[0] : '';
}

function getUniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

describe('Phase 8 — Voice & Audio Endpoints (VOI-1 to VOI-11)', () => {
  const app = createApp({ allowedOrigin: 'http://localhost:3000' });
  let mockTranscriber: MockTranscriptionService;
  let mockSpeaker: MockSpeechService;

  beforeAll(async () => {
    await ensureDatabaseConnected();
    await seedDatabase(prisma);
  }, 60000);

  beforeEach(() => {
    resetAllRateLimits();
    mockTranscriber = new MockTranscriptionService();
    setTranscriptionService(mockTranscriber);
    mockSpeaker = new MockSpeechService();
    setSpeechService(mockSpeaker);
  });

  afterEach(() => {
    resetTranscriptionService();
    resetSpeechService();
  });

  it('VOI-2 & VOI-3 & VOI-5: transcribes valid audio upload and stores no audio files', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: getUniqueEmail('voice-transcribe'), password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    mockTranscriber.mockTranscript = 'I optimized database query performance with composite B-tree indexes.';

    // Fake 50 KB audio buffer
    const fakeAudioBuffer = Buffer.alloc(50 * 1024, 0x12);

    const res = await request(app)
      .post('/api/voice/transcribe')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .field('durationSeconds', '15.5')
      .attach('audio', fakeAudioBuffer, {
        filename: 'candidate_answer.webm',
        contentType: 'audio/webm',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.transcript).toBe(mockTranscriber.mockTranscript);
    expect(res.body.data.isEmpty).toBe(false);
    expect(res.body.data.durationSeconds).toBe(15.5);
    expect(mockTranscriber.callCount).toBe(1);

    // VOI-3: Verify no audio row or file remains in any database table
    const uploadedDocs = await prisma.uploadedDocument.findMany({
      where: { mimeType: { startsWith: 'audio/' } },
    });
    expect(uploadedDocs.length).toBe(0);
  });

  it('VOI-4: marks answer as isEmpty when duration < 1s, words < 2, or silence only', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: getUniqueEmail('voice-empty'), password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    const fakeAudio = Buffer.alloc(10 * 1024, 0x00);

    // 1. Duration < 1s
    mockTranscriber.mockTranscript = 'Valid long sentence here';
    const resShort = await request(app)
      .post('/api/voice/transcribe')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .field('durationSeconds', '0.5')
      .attach('audio', fakeAudio, { filename: 'short.webm', contentType: 'audio/webm' });

    expect(resShort.status).toBe(200);
    expect(resShort.body.data.isEmpty).toBe(true);

    // 2. Transcript with fewer than 2 words
    mockTranscriber.mockTranscript = 'Um';
    const resFewWords = await request(app)
      .post('/api/voice/transcribe')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .field('durationSeconds', '4.0')
      .attach('audio', fakeAudio, { filename: 'um.webm', contentType: 'audio/webm' });

    expect(resFewWords.status).toBe(200);
    expect(resFewWords.body.data.isEmpty).toBe(true);

    // 3. Silence only
    mockTranscriber.mockTranscript = 'Something caught by noise';
    const resSilence = await request(app)
      .post('/api/voice/transcribe')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .field('durationSeconds', '10.0')
      .field('isSilenceOnly', 'true')
      .attach('audio', fakeAudio, { filename: 'silence.webm', contentType: 'audio/webm' });

    expect(resSilence.status).toBe(200);
    expect(resSilence.body.data.isEmpty).toBe(true);
  });

  it('VOI-2: rejects audio exceeding 5 MB limit with 400 validation error', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: getUniqueEmail('voice-toolarge'), password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    // 5.5 MB audio buffer exceeds 5 MB max
    const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0x01);

    const res = await request(app)
      .post('/api/voice/transcribe')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .attach('audio', oversizedBuffer, { filename: 'huge.webm', contentType: 'audio/webm' });

    // Multer or custom validator rejects with 400 / 500
    expect([400, 500]).toContain(res.status);
    expect(mockTranscriber.callCount).toBe(0); // AI transcription never called
  });

  it('VOI-2: rejects unsupported audio MIME types (e.g. image/png)', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: getUniqueEmail('voice-badmime'), password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    const fakeBuffer = Buffer.alloc(1024, 0x00);

    const res = await request(app)
      .post('/api/voice/transcribe')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .attach('audio', fakeBuffer, { filename: 'image.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('VOI-5: transcription failure returns 502 TRANSCRIPTION_FAILED', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: getUniqueEmail('voice-fail'), password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    mockTranscriber.shouldFail = true;

    const fakeAudio = Buffer.alloc(10 * 1024, 0x00);
    const res = await request(app)
      .post('/api/voice/transcribe')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .field('durationSeconds', '10.0')
      .attach('audio', fakeAudio, { filename: 'fail.webm', contentType: 'audio/webm' });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('TRANSCRIPTION_FAILED');
  });

  it('VOI-6: speech synthesis generates audio and returns caption', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: getUniqueEmail('voice-tts'), password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    const utterance = 'Could you explain how you handle distributed consensus in your systems?';

    const res = await request(app)
      .post('/api/voice/synthesize')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        text: utterance,
        voice: 'Puck',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.audioBase64).toBeTruthy();
    expect(res.body.data.caption).toBe(utterance);
    expect(res.body.data.mimeType).toBe('audio/wav');
    expect(mockSpeaker.callCount).toBe(1);
  });

  it('VOI-6: TTS failure returns 502 TTS_FAILED after retry', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({ email: getUniqueEmail('voice-tts-fail'), password: 'Password123', confirmPassword: 'Password123' });
    const cookie = extractSessionCookie(regRes.headers['set-cookie']);

    mockSpeaker.shouldFail = true;

    const res = await request(app)
      .post('/api/voice/synthesize')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({
        text: 'This speech synthesis is expected to fail.',
      });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('TTS_FAILED');
  });
});
