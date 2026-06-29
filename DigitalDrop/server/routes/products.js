const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const Product = require('../models/Product');
const authMiddleware = require('../middleware/authMiddleware');

// Multer config with diskStorage for two destinations
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'file') {
      cb(null, './uploads/files/');
    } else if (file.fieldname === 'preview') {
      cb(null, './uploads/previews/');
    } else {
      cb(new Error('Unknown field'), null);
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

// GET /api/products — list all, optional ?category= filter
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch products', error: err.message });
  }
});

// GET /api/products/:id — single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch product', error: err.message });
  }
});

// POST /api/products — create product (protected)
router.post(
  '/',
  authMiddleware,
  upload.fields([{ name: 'file' }, { name: 'preview' }]),
  async (req, res) => {
    try {
      const { name, description, category, price } = req.body;

      if (!name || !description || !category || price === undefined) {
        return res.status(400).json({ message: 'name, description, category, and price are required' });
      }

      if (!req.files || !req.files['file'] || !req.files['preview']) {
        return res.status(400).json({ message: 'Both file and preview image are required' });
      }

      const fileUrl = req.files['file'][0].path.replace(/\\/g, '/');
      const previewImage = req.files['preview'][0].path.replace(/\\/g, '/');

      const product = await Product.create({
        name,
        description,
        category,
        price: parseFloat(price),
        fileUrl,
        previewImage,
      });

      res.status(201).json(product);
    } catch (err) {
      res.status(500).json({ message: 'Failed to create product', error: err.message });
    }
  }
);

// PUT /api/products/:id — update product (protected)
router.put(
  '/:id',
  authMiddleware,
  upload.fields([{ name: 'file' }, { name: 'preview' }]),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const { name, description, category, price } = req.body;
      if (name) product.name = name;
      if (description) product.description = description;
      if (category) product.category = category;
      if (price !== undefined) product.price = parseFloat(price);

      if (req.files && req.files['file']) {
        product.fileUrl = req.files['file'][0].path.replace(/\\/g, '/');
      }
      if (req.files && req.files['preview']) {
        product.previewImage = req.files['preview'][0].path.replace(/\\/g, '/');
      }

      await product.save();
      res.status(200).json(product);
    } catch (err) {
      res.status(500).json({ message: 'Failed to update product', error: err.message });
    }
  }
);

// DELETE /api/products/:id — delete product (protected)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete product', error: err.message });
  }
});

module.exports = router;
