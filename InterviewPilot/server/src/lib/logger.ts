import pino from 'pino';

/**
 * Structured logger enforcing SEC-7 and SEC-8:
 * Never logs secrets, passwords, tokens, transcripts, or document contents.
 */
export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: {
    paths: [
      'password',
      '*.password',
      'passwordHash',
      '*.passwordHash',
      'token',
      '*.token',
      'cookie',
      '*.cookie',
      'authorization',
      '*.authorization',
      'headers.cookie',
      'headers.authorization',
      'apiKey',
      '*.apiKey',
      'secret',
      '*.secret',
      'transcript',
      '*.transcript',
      'pastedText',
      '*.pastedText',
      'content',
      '*.content',
    ],
    censor: '[REDACTED]',
  },
});
