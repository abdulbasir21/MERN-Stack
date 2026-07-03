const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html }) => {
  // If SMTP is not configured, log to console and skip silently
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log(`\n📧  [EMAIL STUB] To: ${to} | Subject: ${subject}`);
    console.log(`    (Configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env to send real emails)\n`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
      from: `"SafeCity Portal" <${fromAddress}>`,
      to,
      subject,
      html,
    });

    console.log(`✅  Email sent to ${to}`);
  } catch (err) {
    // Don't throw — email failures should never block API responses
    console.error(`⚠️  Email send failed to ${to}:`, err.message);
  }
};

module.exports = sendEmail;
