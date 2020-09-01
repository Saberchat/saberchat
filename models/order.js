const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: String,
  items: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrderItem'
    }
  ],
  instructions: String,
  charge: Number,
  date: String,
  present: Boolean
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model('Order', orderSchema);
