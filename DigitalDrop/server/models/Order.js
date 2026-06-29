const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  buyerEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  amountPaid: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['stripe'],
  },
  paymentId: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  downloadToken: {
    type: String,
    unique: true,
    sparse: true,
  },
  tokenExpiresAt: {
    type: Date,
    default: null,
  },
  downloadedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Order', orderSchema);