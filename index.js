require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const Product = require('./models/Product');
const Order = require('./models/Order');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shopco';

// Configure Cloudinary if keys are provided in .env
const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('☁️ Cloudinary Storage configured successfully');
}

let isMongoConnected = false;

// Connect to MongoDB Atlas or local MongoDB
mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    isMongoConnected = true;
    console.log('✅ Connected to MongoDB Database successfully');
    seedDatabaseIfEmpty();
  })
  .catch((err) => {
    isMongoConnected = false;
    console.warn('⚠️ MongoDB connection warning, running with local storage fallback:', err.message);
  });

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());

// Ensure uploads directory exists safely (handling Vercel read-only filesystem)
const uploadsDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.warn('Uploads directory warning:', e.message);
}
app.use('/uploads', express.static(uploadsDir));

// Serve /assets statically from backend/public/assets
try {
  const publicAssetsDir = path.join(__dirname, 'public', 'assets');
  if (fs.existsSync(publicAssetsDir)) {
    app.use('/assets', express.static(publicAssetsDir));
  }
} catch (e) {
  console.warn('Assets directory warning:', e.message);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `img-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Request Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Helper functions for JSON Data Fallback
const getProductsData = () => {
  try {
    const filePath = path.join(__dirname, 'data', 'products.json');
    if (!fs.existsSync(filePath)) return { products: [], reviews: [] };
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return { products: [], reviews: [] };
  }
};

const saveProductsData = (data) => {
  try {
    const filePath = path.join(__dirname, 'data', 'products.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Cannot write to JSON on read-only FS:', e.message);
  }
};

const getOrdersData = () => {
  try {
    const filePath = path.join(__dirname, 'data', 'orders.json');
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return [];
  }
};

const saveOrdersData = (orders) => {
  try {
    const filePath = path.join(__dirname, 'data', 'orders.json');
    fs.writeFileSync(filePath, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Cannot write to JSON on read-only FS:', e.message);
  }
};

// PRODUCT NORMALIZATION HELPER
const normalizeProduct = (p) => {
  if (!p) return null;
  const rawObj = p.toObject ? p.toObject() : { ...p };
  const img = rawObj.imageUrl || rawObj.src || '/assets/new arrivals/tshirt-tape-details.png';
  return {
    ...rawObj,
    id: String(rawObj.id || rawObj._id),
    src: img,
    imageUrl: img,
    gallery: rawObj.gallery && rawObj.gallery.length > 0 ? rawObj.gallery : [img],
    colors: rawObj.colors && rawObj.colors.length > 0 ? rawObj.colors : [
      { name: "Olive Green", hex: "#4F5D4E" },
      { name: "Navy Blue", hex: "#1A2530" },
      { name: "Black", hex: "#111111" }
    ],
    sizes: rawObj.sizes && rawObj.sizes.length > 0 ? rawObj.sizes : ["S", "M", "L", "XL"],
    description: rawObj.description || "Premium apparel built for everyday comfort.",
    style: rawObj.style || "Casual",
    rating: rawObj.rating || 4.5,
    reviewCount: rawObj.reviewCount || 10,
    inStock: rawObj.inStock !== undefined ? rawObj.inStock : true
  };
};

// Seed initial products and orders to MongoDB if DB is empty
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

// ----------------------------------------------------
// HEALTH & FILE UPLOAD ENDPOINTS
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'Backend API Server is operational',
    database: isMongoConnected ? 'MongoDB Connected' : 'JSON Storage Fallback Mode',
    storageMode: hasCloudinary ? 'Cloudinary Cloud Storage' : 'Local Disk Uploads',
    port: PORT
  });
});

// MULTER + CLOUDINARY FILE UPLOAD ENDPOINT
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    let imageUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;

    // Upload to Cloudinary if configured
    if (hasCloudinary) {
      const cloudResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'shopco_products'
      });
      imageUrl = cloudResult.secure_url;

      // Clean up local temp file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to delete temp local upload:', err);
      });
    }

    res.json({
      success: true,
      message: hasCloudinary ? 'Image uploaded to Cloudinary successfully' : 'Image uploaded locally',
      url: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
});

// ----------------------------------------------------
// DYNAMIC ADMIN STATS API
// ----------------------------------------------------
app.get('/api/admin/stats', async (req, res) => {
  try {
    let rawProducts = [];
    let ordersList = [];

    if (isMongoConnected) {
      rawProducts = await Product.find().lean();
      ordersList = await Order.find().lean();
    } else {
      rawProducts = getProductsData().products || [];
      ordersList = getOrdersData();
    }

    const productsList = rawProducts.map(normalizeProduct);

    const totalRevenue = ordersList.reduce(
      (sum, o) => (o.status !== 'Cancelled' ? sum + (Number(o.totalAmount) || 0) : sum),
      0
    );
    const totalOrdersCount = ordersList.length;
    const totalProductsCount = productsList.length;
    const completedOrdersCount = ordersList.filter((o) => o.status === 'Complete').length;

    const topProducts = productsList.slice(0, 4).map((p) => ({
      id: p.id,
      name: p.name,
      price: `$${p.price}`,
      category: p.category || 'Casual',
      rating: p.rating || 4.5,
      reviewCount: p.reviewCount || 12,
      src: p.src
    }));

    const growthData = [
      { name: 'Mon', revenue: 450 },
      { name: 'Tue', revenue: 620 },
      { name: 'Wed', revenue: 380 },
      { name: 'Thu', revenue: 840 },
      { name: 'Fri', revenue: 950 },
      { name: 'Sat', revenue: 1100 },
      { name: 'Sun', revenue: 780 }
    ];

    res.json({
      success: true,
      data: {
        totalRevenue: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        totalOrders: totalOrdersCount,
        totalProducts: totalProductsCount,
        completedOrders: completedOrdersCount,
        topProducts,
        growthData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// ----------------------------------------------------
// PRODUCTS API
// ----------------------------------------------------

// Get new arrivals
app.get('/api/products/new-arrivals', async (req, res) => {
  try {
    let raw = [];
    if (isMongoConnected) {
      raw = await Product.find({ isNewArrival: true }).lean();
    } else {
      raw = (getProductsData().products || []).filter((p) => p.isNewArrival);
    }
    const newArrivals = raw.map(normalizeProduct);
    res.json({ success: true, count: newArrivals.length, data: newArrivals });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// Get top selling products
app.get('/api/products/top-selling', async (req, res) => {
  try {
    let raw = [];
    if (isMongoConnected) {
      raw = await Product.find({ isTopSelling: true }).lean();
    } else {
      raw = (getProductsData().products || []).filter((p) => p.isTopSelling);
    }
    const topSelling = raw.map(normalizeProduct);
    res.json({ success: true, count: topSelling.length, data: topSelling });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// Get all products (with optional filtering and search)
app.get('/api/products', async (req, res) => {
  try {
    let raw = [];
    if (isMongoConnected) {
      raw = await Product.find().lean();
    } else {
      raw = [...(getProductsData().products || [])];
    }

    let products = raw.map(normalizeProduct);
    const { category, style, minPrice, maxPrice, search, sortBy } = req.query;

    if (category && category !== 'All') {
      products = products.filter((p) => p.category && p.category.toLowerCase() === category.toLowerCase());
    }

    if (style && style !== 'All') {
      products = products.filter((p) => p.style && p.style.toLowerCase() === style.toLowerCase());
    }

    if (minPrice) {
      products = products.filter((p) => p.price >= Number(minPrice));
    }

    if (maxPrice) {
      products = products.filter((p) => p.price <= Number(maxPrice));
    }

    if (search) {
      const query = search.toLowerCase();
      products = products.filter(
        (p) => p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query))
      );
    }

    if (sortBy === 'price-low') {
      products.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      products.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'newest') {
      products.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0));
    } else if (sortBy === 'most-popular') {
      products.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// Get single product by ID or Slug
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let raw = null;

    if (isMongoConnected) {
      raw = await Product.findOne({ $or: [{ id: id }, { slug: id }] }).lean();
    } else {
      raw = (getProductsData().products || []).find((p) => p.id === id || p.slug === id);
    }

    if (!raw) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: normalizeProduct(raw) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// Get related products
app.get('/api/products/:id/related', async (req, res) => {
  try {
    const { id } = req.params;
    let raw = [];

    if (isMongoConnected) {
      raw = await Product.find().lean();
    } else {
      raw = getProductsData().products || [];
    }

    const products = raw.map(normalizeProduct);
    const current = products.find((p) => p.id === id || p.slug === id);
    let related = [];
    if (current) {
      related = products.filter((p) => p.category === current.category && p.id !== current.id).slice(0, 4);
    }
    if (related.length === 0) {
      related = products.filter((p) => p.id !== id).slice(0, 4);
    }

    res.json({ success: true, count: related.length, data: related });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// Create Product
app.post('/api/products', async (req, res) => {
  try {
    const { name, price, originalPrice, category, style, description, src, imageUrl, isNewArrival, isTopSelling } = req.body;

    if (!name || !price) {
      return res.status(400).json({ success: false, message: 'Product Name and Price required' });
    }

    const id = String(Date.now());
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const finalImage = src || imageUrl || '/assets/new arrivals/tshirt-tape-details.png';

    const newProductData = {
      id,
      name,
      slug,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      category: category || 'Casual',
      style: style || 'Casual',
      description: description || 'Premium apparel built for everyday comfort.',
      src: finalImage,
      imageUrl: finalImage,
      gallery: [finalImage],
      colors: [
        { name: "Olive Green", hex: "#4F5D4E" },
        { name: "Navy Blue", hex: "#1A2530" },
        { name: "Black", hex: "#111111" }
      ],
      sizes: ["S", "M", "L", "XL"],
      rating: 4.5,
      reviewCount: 10,
      isNewArrival: Boolean(isNewArrival),
      isTopSelling: Boolean(isTopSelling),
      inStock: true
    };

    let createdProduct = newProductData;

    if (isMongoConnected) {
      const doc = new Product(newProductData);
      const savedDoc = await doc.save();
      createdProduct = normalizeProduct(savedDoc);
    } else {
      createdProduct = normalizeProduct(newProductData);
    }

    // Always keep local JSON in sync as backup
    const localData = getProductsData();
    if (!localData.products) localData.products = [];
    localData.products.unshift(createdProduct);
    saveProductsData(localData);

    res.status(201).json({ success: true, message: 'Product created successfully', data: createdProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// Update Product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let updatedProduct = null;

    const updatePayload = { ...req.body };
    if (updatePayload.src || updatePayload.imageUrl) {
      const img = updatePayload.src || updatePayload.imageUrl;
      updatePayload.src = img;
      updatePayload.imageUrl = img;
    }

    if (isMongoConnected) {
      const doc = await Product.findOneAndUpdate({ id: id }, updatePayload, { new: true }).lean();
      if (doc) updatedProduct = normalizeProduct(doc);
    }

    // Sync local JSON
    const localData = getProductsData();
    const index = (localData.products || []).findIndex((p) => p.id === id);
    if (index !== -1) {
      localData.products[index] = normalizeProduct({ ...localData.products[index], ...updatePayload });
      saveProductsData(localData);
      if (!updatedProduct) updatedProduct = localData.products[index];
    }

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product updated successfully', data: updatedProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// Delete Product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected) {
      await Product.deleteOne({ id: id });
    }

    // Sync local JSON
    const localData = getProductsData();
    localData.products = (localData.products || []).filter((p) => p.id !== id);
    saveProductsData(localData);

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// ----------------------------------------------------
// REVIEWS API
// ----------------------------------------------------
app.get('/api/reviews', (req, res) => {
  try {
    const data = getProductsData();
    res.json({ success: true, count: (data.reviews || []).length, data: data.reviews || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// ----------------------------------------------------
// ORDERS API
// ----------------------------------------------------
app.get('/api/orders', async (req, res) => {
  try {
    let orders = [];
    if (isMongoConnected) {
      orders = await Order.find().lean();
    } else {
      orders = getOrdersData();
    }

    const { search, status } = req.query;

    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q)
      );
    }

    if (status && status !== 'All') {
      orders = orders.filter((o) => o.status.toLowerCase() === status.toLowerCase());
    }

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customerName, customerEmail, branch, paymentType, quantity, totalAmount, status, items } = req.body;

    if (!customerName) {
      return res.status(400).json({ success: false, message: 'Customer Name is required' });
    }

    const localOrders = getOrdersData();
    const id = `#${790955 + localOrders.length}`;

    const newOrderData = {
      id,
      customerName,
      customerEmail: customerEmail || `${customerName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
      branch: branch || 'USA',
      paymentType: paymentType || 'Card',
      quantity: quantity || 1,
      totalAmount: totalAmount ? Number(totalAmount) : 180.0,
      orderDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: status || 'Pending',
      items: items || []
    };

    let createdOrder = newOrderData;

    if (isMongoConnected) {
      const doc = new Order(newOrderData);
      createdOrder = await doc.save();
    }

    // Sync local JSON
    localOrders.unshift(newOrderData);
    saveOrdersData(localOrders);

    res.status(201).json({ success: true, message: 'Order created successfully', data: createdOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const cleanId = id.startsWith('#') ? id : `#${id}`;

    let updatedOrder = null;

    if (isMongoConnected) {
      updatedOrder = await Order.findOneAndUpdate(
        { $or: [{ id: id }, { id: cleanId }] },
        { status },
        { new: true }
      ).lean();
    }

    // Sync local JSON
    const localOrders = getOrdersData();
    const order = localOrders.find((o) => o.id === id || o.id === cleanId);
    if (order) {
      order.status = status;
      saveOrdersData(localOrders);
      if (!updatedOrder) updatedOrder = order;
    }

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, message: 'Order status updated successfully', data: updatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = id.startsWith('#') ? id : `#${id}`;

    if (isMongoConnected) {
      await Order.deleteOne({ $or: [{ id: id }, { id: cleanId }] });
    }

    // Sync local JSON
    let localOrders = getOrdersData();
    localOrders = localOrders.filter((o) => o.id !== id && o.id !== cleanId);
    saveOrdersData(localOrders);

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// ----------------------------------------------------
// USERS API
// ----------------------------------------------------
app.get('/api/users', async (req, res) => {
  try {
    let ordersList = [];
    if (isMongoConnected) {
      ordersList = await Order.find().lean();
    } else {
      ordersList = getOrdersData();
    }

    const customerMap = {};

    ordersList.forEach((o) => {
      if (!customerMap[o.customerEmail]) {
        customerMap[o.customerEmail] = {
          id: `cust_${Math.random().toString(36).substr(2, 6)}`,
          name: o.customerName,
          email: o.customerEmail,
          branch: o.branch,
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: o.orderDate,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(o.customerEmail)}`
        };
      }
      customerMap[o.customerEmail].totalOrders += 1;
      customerMap[o.customerEmail].totalSpent += o.totalAmount || 0;
    });

    res.json({ success: true, count: Object.keys(customerMap).length, data: Object.values(customerMap) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Standalone Express API Server running on port ${PORT}`);
    console.log(`📁 Multer static uploads available at: http://localhost:${PORT}/uploads/`);
  });
}

module.exports = app;
