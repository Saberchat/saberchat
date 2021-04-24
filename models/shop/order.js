const mongoose = require('mongoose');

//Orders made from item-selling services like the shop
module.exports = mongoose.model("Order", new mongoose.Schema({
    customer: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    name: String,
    items: [{
        item: {type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem'},
        quantity: Number,
        price: Number //Price of item at ordering point (for shop stats)
    }],
    shop: {type: mongoose.Schema.Types.ObjectId, ref: "Shop"},
    instructions: String,
    charge: Number,
    date: String,
    present: Boolean,
    payingInPerson: Boolean,
}, {timestamps: {createdAt: 'created_at'}
}));
