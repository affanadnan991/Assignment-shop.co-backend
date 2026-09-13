# SHOP.CO Standalone Express Backend Server

This is the dedicated Express.js REST API backend for the `shop.co` e-commerce application and `admin.shop.co` admin portal.

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
```bash
npm run dev
```

### 3. Run in Production Mode
```bash
npm start
```

Default server URL: `http://localhost:5000`

---

## 📡 API Endpoints Summary

### Products
- `GET /api/products` - Get all products (with category, style, price range, search, sorting)
- `GET /api/products/new-arrivals` - Get new arrival products
- `GET /api/products/top-selling` - Get top selling products
- `GET /api/products/:id` - Get single product details by ID or slug
- `GET /api/products/:id/related` - Get related products
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update existing product
- `DELETE /api/products/:id` - Delete product

### Reviews
- `GET /api/reviews` - Get customer reviews

### Orders
- `GET /api/orders` - Get all customer orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Delete order

### Admin & Analytics
- `GET /api/admin/stats` - Get real-time dashboard metrics, top selling items & sales graph
- `GET /api/users` - Get customer metrics and user summary
