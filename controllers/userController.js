const Order = require('../models/Order');
const { getMongoStatus, getOrdersData } = require('../config/db');

// Get all users synthesized from orders
const getAllUsers = async (req, res) => {
  try {
    let ordersList = [];
    if (getMongoStatus()) {
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
};

module.exports = {
  getAllUsers
};
