const mongoose = require("mongoose");

var projectSchema = new mongoose.Schema({
    title: String,
    imgUrl: String,
    text: String,
    author: String
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Project", projectSchema);
