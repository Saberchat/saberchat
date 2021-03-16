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
    likes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Post'}],
}, {
    timestamps: {createdAt: 'created_at'},
    discriminatorKey: 'type'
});

const Post = mongoose.model("Post", postSchema); //Superclass Schema

//Subclass Schema
module.exports.Announcement = Post.discriminator('Announcement', new mongoose.Schema({}));
module.exports.Project = Post.discriminator('Project', new mongoose.Schema({
    creators: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}]
}));

module.exports.PostComment = Post.discriminator('PostComment', new mongoose.Schema({}));
module.exports.Review = Post.discriminator('Review', new mongoose.Schema({}));
module.exports.Report = Post.discriminator('Report', new mongoose.Schema({
    handled: {type: Boolean, default: false}
}));