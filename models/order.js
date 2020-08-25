const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  items: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrderItem'
    }
  ],
  date: String
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model('Order', orderSchema);
