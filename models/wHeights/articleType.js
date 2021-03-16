const mongoose = require('mongoose');

//Article category
module.exports = mongoose.model("ArticleType", new mongoose.Schema({
    name: String,
    articles: [{type: mongoose.Schema.Types.ObjectId, ref: "Article"}]
}));
