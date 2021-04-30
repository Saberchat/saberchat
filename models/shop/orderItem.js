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
    imageLink: {type: Boolean, default: false}, //Allow images to link to larger image on menu
    availableItems: Number,
    displayAvailability: {type: Boolean, default: false}, //Display number available
    upvotes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    shop: {type: mongoose.Schema.Types.ObjectId, ref: "Shop"}
}, {timestamps: {createdAt: 'created_at'}
}));
