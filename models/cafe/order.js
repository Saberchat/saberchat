const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customer: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    name: String,
    items: [{
        item: {type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem'},
        quantity: Number,
        price: Number
    }],
    instructions: String,
    charge: Number,
    date: String,
    present: Boolean,
    payingInPerson: Boolean
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model('Order', orderSchema);