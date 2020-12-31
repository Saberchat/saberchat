const mongoose = require('mongoose');

var articleTypeSchema = new mongoose.Schema({
  name: String,
  articles: [{
    type: mongoose.Schema.Types.ObjectId,
		ref: "Article"
  }]
});

module.exports = mongoose.model('ArticleType', articleTypeSchema);
