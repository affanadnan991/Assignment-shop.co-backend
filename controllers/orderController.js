const Order = require('../models/Order');
const { getMongoStatus, getOrdersData, saveOrdersData } = require('../config/db');

// Get all orders
const getAllOrders = async (req, res) => {
  try {
    let orders = [];
    if (getMongoStatus()) {
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
};

// Create a new order
const createOrder = async (req, res) => {
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

    if (getMongoStatus()) {
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
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const cleanId = id.startsWith('#') ? id : `#${id}`;

    let updatedOrder = null;

    if (getMongoStatus()) {
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
};

// Delete order
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = id.startsWith('#') ? id : `#${id}`;

    if (getMongoStatus()) {
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
};

module.exports = {
  getAllOrders,
  createOrder,
  updateOrderStatus,
  deleteOrder
};
