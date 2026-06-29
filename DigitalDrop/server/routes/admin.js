const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const Admin = require('../models/Admin');
const Order = require('../models/Order');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: 'Logged in successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// POST /api/admin/logout (protected)
router.post('/logout', authMiddleware, (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out' });
});

// GET /api/admin/me (protected)
router.get('/me', authMiddleware, (req, res) => {
  res.status(200).json({ adminId: req.admin.adminId });
});

// GET /api/admin/orders (protected)
router.get('/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('productId', 'name price previewImage')
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders', error: err.message });
  }
});

// GET /api/admin/stats (protected)
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      revenueAgg,
      totalOrders,
      totalProducts,
      revenueByMethodAgg,
      revenueByProductAgg,
      ordersByDayAgg,
      totalOrdersForConversion,
    ] = await Promise.all([
      // 1. Total revenue
      Order.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } },
      ]),

      // 2. Total paid orders
      Order.countDocuments({ status: 'paid' }),

      // 3. Total products
      Product.countDocuments(),

      // 4. Revenue by payment method
      Order.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: '$paymentMethod', revenue: { $sum: '$amountPaid' } } },
      ]),

      // 5. Revenue by product
      Order.aggregate([
        { $match: { status: 'paid' } },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        {
          $group: {
            _id: '$productId',
            productName: { $first: '$product.name' },
            revenue: { $sum: '$amountPaid' },
          },
        },
        { $sort: { revenue: -1 } },
      ]),

      // 6. Orders by day (last 30 days)
      Order.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 7. Total orders for conversion rate
      Order.countDocuments(),
    ]);

    const totalRevenue = revenueAgg[0]?.total ?? 0;

    // Shape revenueByMethod into { stripe: X, safepay: Y }
    const revenueByMethod = { stripe: 0, safepay: 0 };
    for (const item of revenueByMethodAgg) {
      revenueByMethod[item._id] = item.revenue;
    }

    // Shape revenueByProduct into [{ productName, revenue }]
    const revenueByProduct = revenueByProductAgg.map((item) => ({
      productName: item.productName,
      revenue: item.revenue,
    }));

    // Shape ordersByDay into [{ date, count }]
    const ordersByDay = ordersByDayAgg.map((item) => ({
      date: item._id,
      count: item.count,
    }));

    const conversionRate =
      totalOrdersForConversion > 0
        ? Math.round((totalOrders / totalOrdersForConversion) * 100 * 10) / 10
        : 0;

    res.status(200).json({
      totalRevenue,
      totalOrders,
      totalProducts,
      revenueByMethod,
      revenueByProduct,
      ordersByDay,
      conversionRate,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats', error: err.message });
  }
});

module.exports = router;
