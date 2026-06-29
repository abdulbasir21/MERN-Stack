/**
 * Standalone SMTP test — run this to check if your email config works
 * WITHOUT going through Stripe/Safepay at all.
 *
 * Usage:
 *   node test-email.js you@example.com
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

const toAddress = process.argv[2];

if (!toAddress) {
  console.error('Usage: node test-email.js you@example.com');
  process.exit(1);
}

console.log('Using config:', {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  user: process.env.EMAIL_USER,
  from: process.env.EMAIL_FROM,
  hasPass: !!process.env.EMAIL_PASS,
});

async function main() {
  const port = parseInt(process.env.EMAIL_PORT, 10);

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  console.log('\nStep 1: verifying SMTP connection + auth...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection/auth OK\n');
  } catch (err) {
    console.error('❌ SMTP verify failed — this is your problem. Fix credentials/host/port first.');
    console.error({ message: err.message, code: err.code, command: err.command, response: err.response });
    process.exit(1);
  }

  console.log(`Step 2: sending a real test email to ${toAddress}...`);
  try {
    const info = await transporter.sendMail({
      from: `"DigitalDrop Test" <${process.env.EMAIL_FROM}>`,
      to: toAddress,
      subject: 'Test email — DigitalDrop SMTP check',
      html: '<p>If you got this, your SMTP config works. The bug is elsewhere (likely the Stripe webhook itself not firing).</p>',
    });
    console.log('✅ Sent successfully:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });
    console.log('\nCheck the inbox (and spam folder) of', toAddress);
  } catch (err) {
    console.error('❌ sendMail failed — SMTP accepted the connection but rejected the send.');
    console.error({ message: err.message, code: err.code, command: err.command, response: err.response });
    process.exit(1);
  }
}

main();