import nodemailer from 'nodemailer';
import { env } from '../../config/env';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;

    if (env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.EMAIL_HOST,
        port: env.EMAIL_PORT,
        secure: env.EMAIL_PORT === 465,
        auth: {
          user: env.EMAIL_USER,
          pass: env.EMAIL_PASS,
        },
      });
    }
    return this.transporter;
  }

  /**
   * Dispatches email via configured provider.
   * AGENTS.md §8: Never sends to @example.com seeded fake addresses.
   */
  static async sendEmail(options: SendEmailOptions): Promise<{ sent: boolean; stubbed?: boolean }> {
    const isTestAddress =
      options.to.endsWith('@example.com') ||
      options.to.endsWith('@test.com') ||
      env.NODE_ENV === 'test';

    if (isTestAddress) {
      console.log(`[EmailService Stub] Skipped dispatch to synthetic address: ${options.to} (${options.subject})`);
      return { sent: false, stubbed: true };
    }

    const transporter = this.getTransporter();
    if (!transporter) {
      console.warn('[EmailService] SMTP credentials not fully configured; message dispatch skipped.');
      return { sent: false };
    }

    try {
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      console.log(`[EmailService] Email dispatched successfully to ${options.to}`);
      return { sent: true };
    } catch (err: any) {
      console.error(`[EmailService] Failed to send email to ${options.to}:`, err.message);
      return { sent: false };
    }
  }

  /**
   * Email template for new inquiry received (Sent to Service Provider)
   */
  static async sendInquiryReceivedEmail(params: {
    to: string;
    recipientName: string;
    referenceNumber: string;
    serviceTitle: string;
    customerName: string;
  }) {
    const subject = `[QuotePilot] New Inquiry #${params.referenceNumber} Received for ${params.serviceTitle}`;
    const text = `Hello ${params.recipientName},\n\nA new commercial inquiry (#${params.referenceNumber}) has been submitted by ${params.customerName} for "${params.serviceTitle}".\n\nPlease log in to your Provider Desk to review the AI intake brief and begin bilateral discussions.\n\nQuotePilot Institutional Platform`;
    const html = `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff;">
        <div style="border-bottom: 2px solid #004343; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #004343; margin: 0; font-size: 22px;">QuotePilot</h2>
          <span style="font-size: 11px; font-family: monospace; color: #6b7280; text-transform: uppercase;">SECP Regulated Service Marketplace</span>
        </div>
        <p style="font-size: 15px; color: #111827;">Hello <strong>${params.recipientName}</strong>,</p>
        <p style="font-size: 14px; color: #374151; line-height: 1.6;">
          A new commercial inquiry <strong>#${params.referenceNumber}</strong> has been submitted by <strong>${params.customerName}</strong> for <em>${params.serviceTitle}</em>.
        </p>
        <div style="background: #f8f9fa; border: 1px solid #e5e7eb; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <div style="font-size: 12px; font-family: monospace; color: #4b5563;">DOCKET: #${params.referenceNumber}</div>
          <div style="font-size: 14px; font-weight: bold; color: #111827; margin-top: 4px;">${params.serviceTitle}</div>
        </div>
        <p style="font-size: 13px; color: #4b5563;">
          All discussions and quotations are protected under SECP Escrow guidelines.
        </p>
      </div>
    `;
    return this.sendEmail({ to: params.to, subject, text, html });
  }

  /**
   * Email template for quotation received (Sent to Customer)
   */
  static async sendQuotationReceivedEmail(params: {
    to: string;
    recipientName: string;
    referenceNumber: string;
    companyName: string;
    totalAmount: number;
    version: number;
  }) {
    const subject = `[QuotePilot] Official Quotation Slip #${params.referenceNumber} (v${params.version}) Dispatched`;
    const text = `Hello ${params.recipientName},\n\n${params.companyName} has dispatched an official quotation slip (#${params.referenceNumber}) for PKR ${params.totalAmount.toLocaleString()}.\n\nPlease review the milestone schedule and terms in your client portal.\n\nQuotePilot`;
    const html = `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff;">
        <div style="border-bottom: 2px solid #004343; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #004343; margin: 0; font-size: 22px;">QuotePilot</h2>
          <span style="font-size: 11px; font-family: monospace; color: #6b7280; text-transform: uppercase;">Official Quotation Slip</span>
        </div>
        <p style="font-size: 15px; color: #111827;">Hello <strong>${params.recipientName}</strong>,</p>
        <p style="font-size: 14px; color: #374151; line-height: 1.6;">
          <strong>${params.companyName}</strong> has dispatched an official milestone quotation slip for your project.
        </p>
        <div style="background: #f0fdfa; border: 1px solid #99f6e4; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <div style="font-size: 12px; font-family: monospace; color: #0f766e;">SLIP SERIAL: #${params.referenceNumber} (v${params.version})</div>
          <div style="font-size: 20px; font-weight: bold; color: #004343; margin-top: 6px;">PKR ${params.totalAmount.toLocaleString()}</div>
          <div style="font-size: 12px; color: #0f766e; margin-top: 4px;">Meezan Bank Corporate Segregated Escrow</div>
        </div>
        <p style="font-size: 13px; color: #4b5563;">
          You can inspect the complete milestone docket, request revisions, or accept the covenant in your portal.
        </p>
      </div>
    `;
    return this.sendEmail({ to: params.to, subject, text, html });
  }

  /**
   * Email template for customer decision (Accepted or Declined)
   */
  static async sendQuotationDecisionEmail(params: {
    to: string;
    recipientName: string;
    referenceNumber: string;
    customerName: string;
    status: 'accepted' | 'rejected';
    reason?: string;
  }) {
    const isAccepted = params.status === 'accepted';
    const subject = `[QuotePilot] Quotation #${params.referenceNumber} ${isAccepted ? 'Accepted' : 'Declined'}`;
    const text = `Hello ${params.recipientName},\n\nClient ${params.customerName} has ${isAccepted ? 'ACCEPTED' : 'DECLINED'} Quotation Slip #${params.referenceNumber}.${params.reason ? `\nReason: ${params.reason}` : ''}\n\nQuotePilot`;
    const html = `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff;">
        <div style="border-bottom: 2px solid ${isAccepted ? '#059669' : '#dc2626'}; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #004343; margin: 0; font-size: 22px;">QuotePilot</h2>
          <span style="font-size: 11px; font-family: monospace; color: ${isAccepted ? '#059669' : '#dc2626'}; text-transform: uppercase; font-weight: bold;">
            Quotation ${params.status.toUpperCase()}
          </span>
        </div>
        <p style="font-size: 15px; color: #111827;">Hello <strong>${params.recipientName}</strong>,</p>
        <p style="font-size: 14px; color: #374151; line-height: 1.6;">
          Client <strong>${params.customerName}</strong> has <strong>${isAccepted ? 'accepted and confirmed the milestone scope' : 'declined the quotation slip'}</strong> for docket #${params.referenceNumber}.
        </p>
        ${params.reason ? `<div style="background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 6px; font-size: 13px; color: #991b1b; margin: 16px 0;">Client Feedback: ${params.reason}</div>` : ''}
      </div>
    `;
    return this.sendEmail({ to: params.to, subject, text, html });
  }
}
