const mongoose = require('mongoose');

var orderItemSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    imgUrl: {
        url: String,
        display: Boolean
    },
    imageFile: {
        filename: String,
        url: String,
        originalName: String,
        display: Boolean
    },
    availableItems: Number,
    upvotes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    cafe: {type: mongoose.Schema.Types.ObjectId, ref: "Cafe"}
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model('OrderItem', orderItemSchema);
