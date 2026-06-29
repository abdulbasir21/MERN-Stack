const express = require('express');
const Stripe = require('stripe');
const axios = require('axios');
const router = express.Router();

const Product = require('../models/Product');
const Order = require('../models/Order');

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
    res.status(500).json({ message: 'Failed to create Stripe session', error: err.message });
  }
});

// POST /api/payment/safepay/create-session
router.post('/safepay/create-session', async (req, res) => {
  try {
    const { productId, buyerEmail } = req.body;

    if (!productId || !buyerEmail) {
      return res.status(400).json({ message: 'productId and buyerEmail are required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let safepayResponse;
    try {
      safepayResponse = await axios.post(
        'https://sandbox.api.getsafepay.com/order/v1/init',
        {
          merchant: process.env.SAFEPAY_API_KEY,
          intent: 'CYBERSOURCE',
          mode: 'payment',
          currency: 'PKR',
          amount: Math.round(product.price * 28000), // price in USD * 280 PKR/USD * 100 paisas
          metadata: {
            source: productId.toString(),
            buyer: buyerEmail,
          },
        },
        {
          headers: {
            'X-SFPY-MERCHANT-SECRET': process.env.SAFEPAY_SECRET_KEY,
          },
        }
      );
    } catch (safepayErr) {
      return res.status(503).json({ message: 'Safepay unavailable, please use card payment' });
    }

    const tracker = safepayResponse.data?.data?.token || safepayResponse.data?.tracker;

    await Order.create({
      productId,
      buyerEmail,
      amountPaid: product.price,
      paymentMethod: 'safepay',
      paymentId: tracker || `safepay_${Date.now()}`,
      status: 'pending',
    });

    const checkoutUrl = `https://sandbox.api.getsafepay.com/checkout/pay?tracker=${tracker}&source=custom`;
    res.status(200).json({ url: checkoutUrl });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create Safepay session', error: err.message });
  }
});

module.exports = router;
