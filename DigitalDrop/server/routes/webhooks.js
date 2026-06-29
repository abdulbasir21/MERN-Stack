const express = require('express');
const nodemailer = require('nodemailer');

const Order = require('../models/Order');
const Product = require('../models/Product');
const { generateDownloadToken, getTokenExpiry } = require('../utils/tokenGenerator');

// ─── Email helper ────────────────────────────────────────────────────────────
async function sendConfirmationEmail(buyerEmail, productName, downloadToken) {
  console.log('[email] Preparing to send confirmation email', {
    to: buyerEmail,
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    from: process.env.EMAIL_FROM,
    hasPass: !!process.env.EMAIL_PASS,
  });

  if (!buyerEmail) {
    throw new Error('sendConfirmationEmail called with no buyerEmail — check session.metadata / order.buyerEmail');
  }
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Missing EMAIL_HOST / EMAIL_USER / EMAIL_PASS env vars — email transport not configured');
  }

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

  try {
    await transporter.verify();
    console.log('[email] SMTP connection verified OK');
  } catch (verifyErr) {
    console.error('[email] SMTP verify() FAILED:', {
      message: verifyErr.message,
      code: verifyErr.code,
      command: verifyErr.command,
      response: verifyErr.response,
    });
    throw verifyErr;
  }

  const downloadUrl = `${process.env.SERVER_URL}/api/download/${downloadToken}`;
  console.log('[email] Download URL:', downloadUrl);

  try {
    const info = await transporter.sendMail({
      from: `"DigitalDrop" <${process.env.EMAIL_FROM}>`,
      to: buyerEmail,
      subject: '✅ Your DigitalDrop download is ready',
      html: `
        <h2>Payment confirmed!</h2>
        <p>Your download for <strong>${productName}</strong> is ready.</p>
        <p><a href="${downloadUrl}">Click here to download</a></p>
        <p><small>This link expires in 24 hours.</small></p>
      `,
    });
    console.log('[email] sendMail accepted by SMTP server:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });
  } catch (sendErr) {
    console.error('[email] sendMail FAILED:', {
      message: sendErr.message,
      code: sendErr.code,
      command: sendErr.command,
      response: sendErr.response,
    });
    throw sendErr;
  }
}

// ─── Stripe Webhook Router ───────────────────────────────────────────────────
const stripeRouter = express.Router();

stripeRouter.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const Stripe = require('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook verification failed:', err.message);
    return res.status(400).json({ message: `Webhook error: ${err.message}` });
  }

  console.log(`[stripe webhook] Received event: ${event.type} (id: ${event.id})`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata || {};
    const { productId, buyerEmail } = metadata;

    // ── DEBUG ──
    console.log('session.id:', session.id);
    console.log('productId from metadata:', productId);
    console.log('buyerEmail from metadata:', buyerEmail);
    // ── END DEBUG ──

    console.log('[stripe webhook] checkout.session.completed', {
      sessionId: session.id,
      productId,
      buyerEmail,
      hasMetadata: !!session.metadata,
    });

    try {
      const order = await Order.findOne({ paymentId: session.id });
      console.log('order found:', order);

      if (!order) {
        console.warn(`[stripe webhook] Order not found for session ${session.id} — skipping`);
        return res.status(200).json({ received: true });
      }

      if (order.status === 'paid') {
        console.log(`[stripe webhook] Order ${order._id} already marked paid — skipping`);
        return res.status(200).json({ received: true });
      }

      const downloadToken = generateDownloadToken();
      const tokenExpiresAt = getTokenExpiry();

      await Order.findByIdAndUpdate(order._id, {
        status: 'paid',
        downloadToken,
        tokenExpiresAt,
      });
      console.log(`[stripe webhook] Order ${order._id} marked PAID, token generated`);

      const product = await Product.findById(productId);
      const productName = product ? product.name : 'your product';

      try {
        await sendConfirmationEmail(buyerEmail, productName, downloadToken);
        console.log(`[stripe webhook] Confirmation email sent for order ${order._id}`);
      } catch (emailErr) {
        console.error(`[stripe webhook] Failed to send confirmation email for order ${order._id}:`, emailErr.message);
      }
    } catch (err) {
      console.error('Error processing Stripe webhook:', err.message);
      return res.status(200).json({ received: true });
    }
  }

  res.status(200).json({ received: true });
});

module.exports = { stripeRouter };