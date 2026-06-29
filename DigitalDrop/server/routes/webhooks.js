const express = require('express');
const Stripe = require('stripe');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const Order = require('../models/Order');
const Product = require('../models/Product');
const { generateDownloadToken, getTokenExpiry } = require('../utils/tokenGenerator');

// ─── Email helper ────────────────────────────────────────────────────────────
async function sendConfirmationEmail(buyerEmail, productName, downloadToken) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const downloadUrl = `${process.env.CLIENT_URL}/success?token=${downloadToken}`;

  await transporter.sendMail({
    from: `"DigitalDrop" <${process.env.EMAIL_USER}>`,
    to: buyerEmail,
    subject: '✅ Your DigitalDrop download is ready',
    html: `
      <h2>Payment confirmed!</h2>
      <p>Your download for <strong>${productName}</strong> is ready.</p>
      <p><a href="${downloadUrl}">Click here to download</a></p>
      <p><small>This link expires in 24 hours.</small></p>
    `,
  });
}

// ─── Stripe Webhook Router ───────────────────────────────────────────────────
const stripeRouter = express.Router();

stripeRouter.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook verification failed:', err.message);
    return res.status(400).json({ message: `Webhook error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { productId, buyerEmail } = session.metadata;

    try {
      const order = await Order.findOne({ paymentId: session.id });

      if (!order) {
        console.warn(`Order not found for session ${session.id} — skipping`);
        return res.status(200).json({ received: true });
      }

      // Idempotency: skip if already paid
      if (order.status === 'paid') {
        return res.status(200).json({ received: true });
      }

      const downloadToken = generateDownloadToken();
      const tokenExpiresAt = getTokenExpiry();

      await Order.findByIdAndUpdate(order._id, {
        status: 'paid',
        downloadToken,
        tokenExpiresAt,
      });

      const product = await Product.findById(productId);
      const productName = product ? product.name : 'your product';

      try {
        await sendConfirmationEmail(buyerEmail, productName, downloadToken);
      } catch (emailErr) {
        console.error('Failed to send confirmation email:', emailErr.message);
        // Don't fail the webhook response just because email failed
      }
    } catch (err) {
      console.error('Error processing Stripe webhook:', err.message);
      // Still return 200 so Stripe doesn't retry (DB errors shouldn't cause retries)
      return res.status(200).json({ received: true });
    }
  }

  res.status(200).json({ received: true });
});

// ─── Safepay Webhook Router ──────────────────────────────────────────────────
const safepayRouter = express.Router();

safepayRouter.post('/safepay', async (req, res) => {
  try {
    const receivedSig = req.headers['x-sfpy-signature'];
    const payload = JSON.stringify(req.body);
    const expectedSig = crypto
      .createHmac('sha256', process.env.SAFEPAY_SECRET_KEY)
      .update(payload)
      .digest('hex');

    if (receivedSig !== expectedSig) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const { event, data } = req.body;

    // Safepay sends payment.success or similar event
    if (event === 'payment.success' || event === 'PAYMENT_SUCCESS') {
      const trackerId = data?.tracker?.token || data?.token;
      const metadata = data?.tracker?.metadata || data?.metadata || {};
      const buyerEmail = metadata.buyer;
      const productId = metadata.source;

      const order = await Order.findOne({ paymentId: trackerId });

      if (!order) {
        console.warn(`Safepay order not found for tracker ${trackerId}`);
        return res.status(200).json({ received: true });
      }

      if (order.status === 'paid') {
        return res.status(200).json({ received: true });
      }

      const downloadToken = generateDownloadToken();
      const tokenExpiresAt = getTokenExpiry();

      await Order.findByIdAndUpdate(order._id, {
        status: 'paid',
        downloadToken,
        tokenExpiresAt,
      });

      const product = await Product.findById(order.productId);
      const productName = product ? product.name : 'your product';

      try {
        await sendConfirmationEmail(order.buyerEmail, productName, downloadToken);
      } catch (emailErr) {
        console.error('Failed to send Safepay confirmation email:', emailErr.message);
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Safepay webhook error:', err.message);
    res.status(500).json({ message: 'Webhook processing failed', error: err.message });
  }
});

module.exports = { stripeRouter, safepayRouter };
