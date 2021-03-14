const mongoose = require('mongoose');

//Superclass purchasable schema, to be implemented with orderItems, equipment, and more
var purchasableSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
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
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model('Purchasable', purchasableSchema);
