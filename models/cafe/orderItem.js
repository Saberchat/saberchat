const mongoose = require('mongoose');

//Order Item to be purchased in orders
module.exports = mongoose.model("OrderItem", new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    link: String,
    imgUrl: {
        url: String,
        display: Boolean
    },
    mediaFile: {
        filename: String,
        url: String,
        originalName: String,
        display: Boolean
    },
    availableItems: Number,
    upvotes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    cafe: {type: mongoose.Schema.Types.ObjectId, ref: "Cafe"}
}, {timestamps: {createdAt: 'created_at'}
}));
