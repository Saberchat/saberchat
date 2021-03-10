const mongoose = require("mongoose");

var postSchema = new mongoose.Schema({
    type: String, //announcement, comment, review, project, report, etc.
    subject: String,
    sender: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    text: String,
    images: [{type: String}],
    mediaFiles: [{
        filename: String,
        url: String,
        originalName: String
    }],
    date: String,
    involved: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    likes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Post'}], //Project creators/comment @'s
    processed: {type: Boolean, default: false} //Only for reports
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Post", postSchema);