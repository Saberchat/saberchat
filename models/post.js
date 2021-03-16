const mongoose = require("mongoose");

//Superclass Post schema
const Post = mongoose.model("Post", new mongoose.Schema({
    subject: String,
    sender: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    text: String,
    images: [{type: String}],
    mediaFiles: [{
        filename: String,
        url: String,
        originalName: String
    }],
    date: String,
    likes: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}],
    comments: [{type: mongoose.Schema.Types.ObjectId, ref: "PostComment"}],
}, {
    timestamps: {createdAt: "created_at"},
    discriminatorKey: "type"
}));

module.exports = { //All subclass Schema
    Announcement: Post.discriminator("Announcement", new mongoose.Schema({})), //Faculty/administrator announcements
    PostComment: Post.discriminator("PostComment", new mongoose.Schema({})), //Comments on projects/announcements/reports
    Review: Post.discriminator("Review", new mongoose.Schema({})), //Reviews for course tutors

    //Subclasses with appended fields
    Project: Post.discriminator("Project", new mongoose.Schema({ //Student projects
        creators: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}]
    })),
    Report: Post.discriminator("Report", new mongoose.Schema({ //Error reports/new feature requests
        handled: {type: Boolean, default: false}
    })),
    Article: Post.discriminator("Article", new mongoose.Schema({ //School/organization news journal articles
        content: [{type: String, data: {}}]
    }))
};