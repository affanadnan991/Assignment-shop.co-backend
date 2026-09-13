const Product = require('../models/Product');
const { getMongoStatus, getProductsData, saveProductsData } = require('../config/db');
const normalizeProduct = require('../utils/normalizeProduct');

// Get New Arrivals
const getNewArrivals = async (req, res) => {
  try {
    let raw = [];
    if (getMongoStatus()) {
      raw = await Product.find({ isNewArrival: true }).lean();
    } else {
      raw = (getProductsData().products || []).filter((p) => p.isNewArrival);
    }
    const newArrivals = raw.map(normalizeProduct);
    res.json({ success: true, count: newArrivals.length, data: newArrivals });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Get Top Selling Products
const getTopSelling = async (req, res) => {
  try {
    let raw = [];
    if (getMongoStatus()) {
      raw = await Product.find({ isTopSelling: true }).lean();
    } else {
      raw = (getProductsData().products || []).filter((p) => p.isTopSelling);
    }
    const topSelling = raw.map(normalizeProduct);
    res.json({ success: true, count: topSelling.length, data: topSelling });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Get All Products (with filters, search, sorting)
const getAllProducts = async (req, res) => {
  try {
    let raw = [];
    if (getMongoStatus()) {
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
};

// Get Product by ID or Slug
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    let raw = null;

    if (getMongoStatus()) {
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
};

// Get Related Products
const getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    let raw = [];

    if (getMongoStatus()) {
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
};

// Create Product
const createProduct = async (req, res) => {
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

    if (getMongoStatus()) {
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
};

// Update Product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let updatedProduct = null;

    const updatePayload = { ...req.body };
    if (updatePayload.src || updatePayload.imageUrl) {
      const img = updatePayload.src || updatePayload.imageUrl;
      updatePayload.src = img;
      updatePayload.imageUrl = img;
    }

    if (getMongoStatus()) {
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
};

// Delete Product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (getMongoStatus()) {
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
};

// Get Reviews
const getReviews = (req, res) => {
  try {
    const data = getProductsData();
    res.json({ success: true, count: (data.reviews || []).length, data: data.reviews || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getNewArrivals,
  getTopSelling,
  getAllProducts,
  getProductById,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getReviews
};
