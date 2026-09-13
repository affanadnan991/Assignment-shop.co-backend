const Product = require('../models/Product');
const Order = require('../models/Order');
const { getMongoStatus, getProductsData, getOrdersData } = require('../config/db');
const normalizeProduct = require('../utils/normalizeProduct');

// Get Dynamic Admin Dashboard Statistics
const getAdminStats = async (req, res) => {
  try {
    let rawProducts = [];
    let ordersList = [];

    if (getMongoStatus()) {
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
};

module.exports = {
  getAdminStats
};
