const mongoose = require('mongoose');

const Category = mongoose.model("Category", new mongoose.Schema({
    name: String,
    organization: {type: mongoose.Schema.Types.ObjectId, ref: "Group"}
}, {
    timestamps: {createdAt: 'created_at'},
    discriminatorKey: "type"
}));

module.exports = {
    ItemCategory: Category.discriminator("ItemCategory", new mongoose.Schema({
        items: [{type: mongoose.Schema.Types.ObjectId, ref: "OrderItem"}]
    })),
    ArticleCategory: Category.discriminator("ArticleCategory", new mongoose.Schema({
        articles: [{type: mongoose.Schema.Types.ObjectId, ref: "Article"}]
    }))
};
