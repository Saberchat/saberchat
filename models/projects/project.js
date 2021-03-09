const mongoose = require("mongoose");

var projectSchema = new mongoose.Schema({
    title: String,
    poster: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    images: [{type: String}],
    mediaFiles: [{
        filename: String,
        url: String,
        originalName: String
    }],
    text: String,
    date: String,
    creators: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    likes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'PostComment'}]
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Project", projectSchema);
