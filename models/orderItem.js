const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  availableItems: Number,
  isAvailable: Boolean,
});

module.exports = mongoose.model('OrderItem', orderItemSchema);
