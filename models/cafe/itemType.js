const mongoose = require('mongoose');

//Order Item Category
module.exports = mongoose.model("ItemType", new mongoose.Schema({
    name: String,
    items: [{type: mongoose.Schema.Types.ObjectId, ref: "OrderItem"}],
    cafe: {type: mongoose.Schema.Types.ObjectId, ref: "Cafe"}
}, {timestamps: {createdAt: 'created_at'}
}));