const mongoose = require("mongoose");

//comment will have text, author id, author username, and a timestamp for when it was created.

var articleSchema = new mongoose.Schema({
    title: String,
    content: [
        {type: Object}
    ],
    author: String
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Article", articleSchema);