require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const Product = require('./models/Product');
const Order = require('./models/Order');
const Admin = require('./models/Admin');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    Product.deleteMany(),
    Order.deleteMany(),
    Admin.deleteMany(),
  ]);

  // Create admin
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  await Admin.create({
    email: 'admin@digitaldrop.com',
    passwordHash,
  });

  // Create 6 products
  const products = await Product.create([
    {
      name: 'Dashboard UI Kit',
      description: '120+ Figma components, dark/light mode, mobile responsive',
      category: 'ui-kit',
      price: 19,
      fileUrl: 'uploads/files/sample.zip',
      previewImage: 'uploads/previews/sample.jpg',
      createdAt: randomDateInLast30Days(),
    },
    {
      name: 'React Starter Pack',
      description: 'Full React 18 + Vite + Tailwind boilerplate with auth',
      category: 'template',
      price: 29,
      fileUrl: 'uploads/files/sample.zip',
      previewImage: 'uploads/previews/sample.jpg',
      createdAt: randomDateInLast30Days(),
    },
    {
      name: 'Figma Landing Kit',
      description: '20 landing page sections, fully editable in Figma',
      category: 'figma',
      price: 14,
      fileUrl: 'uploads/files/sample.zip',
      previewImage: 'uploads/previews/sample.jpg',
      createdAt: randomDateInLast30Days(),
    },
    {
      name: 'Admin Panel Template',
      description: 'Complete admin dashboard UI with charts and tables',
      category: 'template',
      price: 24,
      fileUrl: 'uploads/files/sample.zip',
      previewImage: 'uploads/previews/sample.jpg',
      createdAt: randomDateInLast30Days(),
    },
    {
      name: 'E-commerce UI Kit',
      description: 'Full product listing, cart, and checkout UI components',
      category: 'ui-kit',
      price: 34,
      fileUrl: 'uploads/files/sample.zip',
      previewImage: 'uploads/previews/sample.jpg',
      createdAt: randomDateInLast30Days(),
    },
    {
      name: 'MERN Course Bundle',
      description: '12 hours of MERN stack development from zero to deployed',
      category: 'course',
      price: 49,
      fileUrl: 'uploads/files/sample.zip',
      previewImage: 'uploads/previews/sample.jpg',
      createdAt: randomDateInLast30Days(),
    },
  ]);

  const buyerEmails = [
    'buyer1@gmail.com',
    'test@yahoo.com',
    'shopper@hotmail.com',
    'devuser@proton.me',
    'alice@outlook.com',
    'bob@icloud.com',
    'carol@gmail.com',
    'dave@yahoo.com',
    'eve@gmail.com',
    'frank@outlook.com',
  ];

  const paymentMethods = ['stripe', 'safepay'];

  const orders = [];

  // 7 paid orders
  for (let i = 0; i < 7; i++) {
    const createdAt = randomDateInLast30Days();
    const tokenExpiry = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
    const downloadToken = crypto.randomUUID();

    orders.push({
      productId: products[i % products.length]._id,
      buyerEmail: buyerEmails[i],
      amountPaid: products[i % products.length].price,
      paymentMethod: paymentMethods[i % 2],
      paymentId: `pay_seed_${crypto.randomUUID()}`,
      status: 'paid',
      downloadToken,
      tokenExpiresAt: tokenExpiry,
      downloadedAt:
        i < 5
          ? new Date(createdAt.getTime() + 60 * 60 * 1000)
          : null,
      createdAt,
    });
  }

  // 3 pending orders
  for (let i = 7; i < 10; i++) {
    orders.push({
      productId: products[i % products.length]._id,
      buyerEmail: buyerEmails[i],
      amountPaid: products[i % products.length].price,
      paymentMethod: paymentMethods[i % 2],
      paymentId: `pay_seed_${crypto.randomUUID()}`,
      status: 'pending',
      createdAt: randomDateInLast30Days(),
    });
  }

  await Order.create(orders);

  console.log('✅ Seeded: 1 admin, 6 products, 10 orders');
  process.exit(0);
}

function randomDateInLast30Days() {
  const msInDay = 24 * 60 * 60 * 1000;
  const randomDays = Math.floor(Math.random() * 30);
  return new Date(Date.now() - randomDays * msInDay);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});