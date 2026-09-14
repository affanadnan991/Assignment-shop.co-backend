const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const Order = require('../models/Order');

let isMongoConnected = false;

const getProductsData = () => {
  try {
    const filePath = path.join(__dirname, '..', 'data', 'products.json');
    if (!fs.existsSync(filePath)) return { products: [], reviews: [] };
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return { products: [], reviews: [] };
  }
};

const saveProductsData = (data) => {
  try {
    const filePath = path.join(__dirname, '..', 'data', 'products.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Cannot write to JSON on read-only FS:', e.message);
  }
};

const getOrdersData = () => {
  try {
    const filePath = path.join(__dirname, '..', 'data', 'orders.json');
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return [];
  }
};

const saveOrdersData = (orders) => {
  try {
    const filePath = path.join(__dirname, '..', 'data', 'orders.json');
    fs.writeFileSync(filePath, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Cannot write to JSON on read-only FS:', e.message);
  }
};

async function seedDatabaseIfEmpty() {
  try {
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      const localData = getProductsData();
      if (localData.products && localData.products.length > 0) {
        await Product.insertMany(localData.products);
        console.log('🌱 Seeded initial products into MongoDB Atlas');
      }
    }

    const orderCount = await Order.countDocuments();
    if (orderCount === 0) {
      const localOrders = getOrdersData();
      if (localOrders.length > 0) {
        await Order.insertMany(localOrders);
        console.log('🌱 Seeded initial orders into MongoDB Atlas');
      }
    }
  } catch (error) {
    console.error('Database seeding error:', error.message);
  }
}

let isMongoConnected = false;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    isMongoConnected = true;
    return;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI environment variable is not defined!');
    isMongoConnected = false;
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000
    });
    isMongoConnected = true;
    console.log('✅ Connected to MongoDB Database successfully');
    await seedDatabaseIfEmpty();
  } catch (err) {
    isMongoConnected = false;
    console.warn('⚠️ MongoDB connection warning, running with local storage fallback:', err.message);
  }
};

const getMongoStatus = () => Boolean(mongoose.connection.readyState >= 1 || isMongoConnected);

module.exports = {
  connectDB,
  getMongoStatus,
  getProductsData,
  saveProductsData,
  getOrdersData,
  saveOrdersData
};
