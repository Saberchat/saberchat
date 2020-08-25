const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  name: String,
  description: String,
  isAvailable: Boolean
});

module.exports = mongoose.model('OrderItem', orderItemSchema);
