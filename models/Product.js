const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    slug: { type: String },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    discountPercentage: { type: Number },
    category: { type: String, default: 'Casual' },
    style: { type: String, default: 'Casual' },
    description: { type: String, default: 'Premium apparel built for everyday comfort.' },
    src: { type: String, default: '/images/products/product-1.png' },
    imageUrl: { type: String },
    gallery: [{ type: String }],
    rating: { type: Number, default: 4.5 },
    reviewCount: { type: Number, default: 10 },
    isNewArrival: { type: Boolean, default: false },
    isTopSelling: { type: Boolean, default: false },
    inStock: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
