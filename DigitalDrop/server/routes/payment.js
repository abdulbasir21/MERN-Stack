const express = require('express');
const Stripe = require('stripe');
const axios = require('axios');
const router = express.Router();

const Product = require('../models/Product');
const Order = require('../models/Order');

const SAFEPAY_BASE_URL =
  process.env.SAFEPAY_ENV === 'production'
    ? 'https://api.getsafepay.com/components'
    : 'https://sandbox.api.getsafepay.com/components';

const SAFEPAY_INIT_URL =
  process.env.SAFEPAY_ENV === 'production'
    ? 'https://api.getsafepay.com/order/v1/init'
    : 'https://sandbox.api.getsafepay.com/order/v1/init';

function buildSafepayCheckoutUrl({ token, orderId }) {
  const params = new URLSearchParams({
    env: process.env.SAFEPAY_ENV === 'production' ? 'production' : 'sandbox',
    beacon: token,
    source: 'web',
    order_id: orderId,
    redirect_url: `${process.env.CLIENT_URL}/payment/safepay/success`,
    cancel_url: `${process.env.CLIENT_URL}/payment/safepay/cancel`,
  });

  return `${SAFEPAY_BASE_URL}?${params.toString()}`;
}

// POST /api/payment/stripe/create-session
router.post('/stripe/create-session', async (req, res) => {
  try {
    const { productId, buyerEmail } = req.body;

    if (!productId || !buyerEmail) {
      return res.status(400).json({ message: 'productId and buyerEmail are required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: product.name },
            unit_amount: Math.round(product.price * 100),
          },
          quantity: 1,
        },
      ],
      customer_email: buyerEmail,
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/product/${productId}`,
      metadata: {
        productId: productId.toString(),
        buyerEmail,
      },
    });

    await Order.create({
      productId,
      buyerEmail,
      amountPaid: product.price,
      paymentMethod: 'stripe',
      paymentId: session.id,
      status: 'pending',
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe session error:', err?.response?.data || err.message);
    res.status(500).json({
      message: 'Failed to create Stripe session',
      error: err?.response?.data || err.message,
    });
  }
});

module.exports = router;