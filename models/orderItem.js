const mongoose = require('mongoose');

var orderItemSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  imgUrl: String,
  availableItems: Number,
  isAvailable: Boolean,
  upvotes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: []
    }
  ]
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model('OrderItem', orderItemSchema);
