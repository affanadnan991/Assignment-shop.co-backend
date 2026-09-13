const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  id: { type: String },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  selectedColor: { name: String, hex: String },
  selectedSize: { type: String }
});

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    branch: { type: String, default: 'USA' },
    paymentType: { type: String, default: 'Card' },
    quantity: { type: Number, default: 1 },
    totalAmount: { type: Number, required: true },
    orderDate: { type: String },
    status: {
      type: String,
      enum: ['Pending', 'Complete', 'Processing', 'Cancelled'],
      default: 'Pending'
    },
    items: [orderItemSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
