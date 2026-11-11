import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

let transporter = null;

// Allow tests to mock or capture sent emails
let sentEmailsSpy = [];

export function setSentEmailsSpy(spyArray) {
  sentEmailsSpy = spyArray;
}

export function getSentEmailsSpy() {
  return sentEmailsSpy;
}

export function clearSentEmailsSpy() {
  sentEmailsSpy = [];
}

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(toEmail, resetToken) {
  const from = process.env.EMAIL_FROM || 'noreply@scopesentry.ai';
  const resetUrl = `${config.clientOrigin}/reset-password?token=${encodeURIComponent(resetToken)}`;

  // In test environment or if mocked, record without hitting network
  if (config.env === 'test' || !getTransporter()) {
    sentEmailsSpy.push({
      to: toEmail,
      from,
      subject: 'ScopeSentry Password Recovery',
      token: resetToken
    });
    return { success: true, mocked: true };
  }

  const mailOptions = {
    from,
    to: toEmail,
    subject: 'ScopeSentry — Reset Your Password',
    text: `You requested a password reset for your ScopeSentry account.\n\nUse this link within 30 minutes to reset your password:\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0A1A33;">ScopeSentry Password Recovery</h2>
        <p>You requested to reset your password. Click the link below to set a new password (valid for 30 minutes):</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #2563EB; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #64748B; font-size: 13px;">If you did not request this, please ignore this email.</p>
      </div>
    `
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    // Never log passwords, tokens or credentials
    console.error('[Email Integration] Failed to send password reset email:', error.message);
    return { success: false, error: error.message };
  }
}
