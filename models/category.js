const mongoose = require('mongoose');

const Category = mongoose.model("Category", new mongoose.Schema({
    name: String
}, {
    timestamps: {createdAt: 'created_at'},
    discriminatorKey: "type"
}));

module.exports = {
    ItemCategory: Category.discriminator("ItemCategory", new mongoose.Schema({
        items: [{type: mongoose.Schema.Types.ObjectId, ref: "OrderItem"}]
    })),
    PostCategory: Category.discriminator("PostCategory", new mongoose.Schema({
        posts: [{type: mongoose.Schema.Types.ObjectId, ref: "Post"}]
    }))
};