import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export interface SentPasswordResetEmail {
  to: string;
  resetUrl: string;
  token: string;
  sentAt: Date;
}

export interface EmailAdapter {
  sendPasswordResetEmail(to: string, resetUrl: string, token: string): Promise<void>;
}

const capturedTestEmails: SentPasswordResetEmail[] = [];

export function getCapturedTestEmails(): SentPasswordResetEmail[] {
  return [...capturedTestEmails];
}

export function clearCapturedTestEmails(): void {
  capturedTestEmails.length = 0;
}

class SmtpOrMockEmailAdapter implements EmailAdapter {
  async sendPasswordResetEmail(
    to: string,
    resetUrl: string,
    token: string
  ): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      capturedTestEmails.push({
        to,
        resetUrl,
        token,
        sentAt: new Date(),
      });
      return;
    }

    if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASS) {
      logger.warn('SMTP credentials not fully configured; skipping live email send');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT || 587,
      secure: (env.EMAIL_PORT || 587) === 465,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: 'InterviewPilot — Reset your password',
      text: `You requested a password reset for InterviewPilot. This link expires in 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
    });
  }
}

let activeEmailAdapter: EmailAdapter = new SmtpOrMockEmailAdapter();

export function getEmailAdapter(): EmailAdapter {
  return activeEmailAdapter;
}

export function setEmailAdapter(adapter: EmailAdapter): void {
  activeEmailAdapter = adapter;
}
