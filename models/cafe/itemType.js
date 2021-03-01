const mongoose = require('mongoose');

var itemTypeSchema = new mongoose.Schema({
    name: String,
    items: [{type: mongoose.Schema.Types.ObjectId, ref: "OrderItem"}],
    cafe: {type: mongoose.Schema.Types.ObjectId, ref: "Cafe"}
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model('ItemType', itemTypeSchema);
