const mongoose = require('mongoose');

//Orders made from item-selling services like the cafe
module.exports = mongoose.model("Order", new mongoose.Schema({
    customer: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    name: String,
    items: [{
        item: {type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem'},
        quantity: Number,
        price: Number //Price of item at ordering point (for cafe stats)
    }],
    cafe: {type: mongoose.Schema.Types.ObjectId, ref: "Cafe"},
    instructions: String,
    charge: Number,
    date: String,
    present: Boolean,
    payingInPerson: Boolean,
}, {timestamps: {createdAt: 'created_at'}
}));
