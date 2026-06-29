const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const Order = require('../models/Order');

// GET /api/download/:token
router.get('/:token', async (req, res) => {
  try {
    const order = await Order.findOne({ downloadToken: req.params.token }).populate('productId');

    if (!order) {
      return res.status(404).json({ message: 'Invalid download link' });
    }

    if (order.tokenExpiresAt < new Date()) {
      return res.status(410).json({
        message: 'This download link has expired. Please contact support.',
      });
    }

    const absolutePath = path.join(__dirname, '..', order.productId.fileUrl);

    if (!fs.existsSync(absolutePath)) {
      return res.status(500).json({ message: 'File not found on server' });
    }

    // Fire-and-forget: record download timestamp
    Order.findByIdAndUpdate(order._id, { downloadedAt: new Date() }).catch((err) =>
      console.error('Failed to update downloadedAt:', err.message)
    );

    const fileName = order.productId.name.replace(/[^a-z0-9_\-\s]/gi, '_') + '.zip';
    res.download(absolutePath, fileName);
  } catch (err) {
    res.status(500).json({ message: 'Download failed', error: err.message });
  }
});

module.exports = router;
