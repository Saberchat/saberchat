const mongoose = require("mongoose");

//Superclass post schema, to be implemented with announcements, projects, etc.
var postSchema = new mongoose.Schema({
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
}, {
    timestamps: {createdAt: 'created_at'},
    discriminatorKey: 'type'
});

module.exports = mongoose.model("Post", postSchema);