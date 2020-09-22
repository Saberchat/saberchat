const mongoose = require('mongoose');

var orderItemSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  imgUrl: String,
  // type: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: "ItemType"
  // },
  availableItems: Number,
  isAvailable: Boolean,
});

module.exports = mongoose.model('OrderItem', orderItemSchema);
