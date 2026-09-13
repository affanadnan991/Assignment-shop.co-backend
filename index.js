require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const { connectDB, getMongoStatus } = require('./config/db');
const { hasCloudinary } = require('./config/cloudinary');
const { uploadsDir } = require('./middlewares/multer');

const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas or initialize fallback
connectDB();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());

// Serve /uploads statically (handling Vercel read-only filesystem)
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

// Request Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SHOP.CO Express API Server is operational',
    database: getMongoStatus() ? 'MongoDB Connected' : 'JSON Storage Fallback Mode',
    storageMode: hasCloudinary ? 'Cloudinary Cloud Storage' : 'Local Disk Uploads',
    endpoints: {
      health: '/api/health',
      products: '/api/products',
      orders: '/api/orders',
      users: '/api/users',
      adminStats: '/api/admin/stats'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'Backend API Server is operational',
    database: getMongoStatus() ? 'MongoDB Connected' : 'JSON Storage Fallback Mode',
    storageMode: hasCloudinary ? 'Cloudinary Cloud Storage' : 'Local Disk Uploads',
    port: PORT
  });
});

// Mount MVC API Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewRoutes);

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Standalone Express API Server running on port ${PORT}`);
    console.log(`📁 Static uploads available at: http://localhost:${PORT}/uploads/`);
  });
}

module.exports = app;
