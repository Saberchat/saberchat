const mongoose = require("mongoose");

//comment will have text, author id, author username, and a timestamp for when it was created.

var articleSchema = new mongoose.Schema({
  title: String,
  thumbnail: String,
  content: [
    {type: Object}
  ],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  category: String
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Article", articleSchema);
