const mongoose = require('mongoose');

const Category = mongoose.model("Category", new mongoose.Schema({
    name: String
}, {
    timestamps: {createdAt: 'created_at'},
    discriminatorKey: "type"
}));

module.exports = {
    ItemCategory: Category.discriminator("ItemCategory", new mongoose.Schema({ //Shop order item category
        items: [{type: mongoose.Schema.Types.ObjectId, ref: "OrderItem"}]
    })),
    PostCategory: Category.discriminator("PostCategory", new mongoose.Schema({ //Post category (for journal articles, projects, etc.)
        posts: [{type: mongoose.Schema.Types.ObjectId, ref: "Post"}]
    }))
};