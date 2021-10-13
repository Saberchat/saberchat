const mongoose = require("mongoose");

//Superclass Post schema
const Post = mongoose.model("Post", new mongoose.Schema({
    subject: String,
    sender: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    text: String,
    verified: {type: Boolean, default: false},
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
    Announcement: Post.discriminator("Announcement", new mongoose.Schema({ // Faculty/administrator announcements
        public: {type: Boolean, default: true}
    })), 
    PostComment: Post.discriminator("PostComment", new mongoose.Schema({})), //Comments on projects/announcements/reports
    
    //SUBCLASSES WITH APPENDED FIELDS
    Project: Post.discriminator("Project", new mongoose.Schema({ //Student projects
        creators: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}],
        nonaccountCreators: [{type: String}] //Users without accounts
    })),
    Report: Post.discriminator("Report", new mongoose.Schema({ //Error reports/new feature requests
        handled: {type: Boolean, default: false}
    })),
    Review: Post.discriminator("Review", new mongoose.Schema({ //Reviews for course tutors
        rating: {type: Number, default: 0}
    })),
    Article: Post.discriminator("Article", new mongoose.Schema({ //School/organization news journal articles
        content: [{
            text: String,
            data: {}
        }]
    })),
    WHArticle: Post.discriminator("WHArticle", new mongoose.Schema({
        authors: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}],
        content: [{
            text: String,
            data: {}
        }]
    })),
    ArticleLink: Post.discriminator("ArticleLink", new mongoose.Schema({ //Contains references to other articles and serves as a simple post system
        links: [{type: String}]
    })),
    Module: Post.discriminator("Module", new mongoose.Schema({ //Curriculum with attached information
        links: [{type: String}]
    })),
    Event: Post.discriminator("Event", new mongoose.Schema({ //Scheduled Future event
        links: [{type: String}],
        deadline: {day: String, month: String, year: String}
    })),
    Poll: Post.discriminator('Poll', new mongoose.Schema({
        googleFormUrl: String,
        width: {type: Number, default: 480},
        height: {type: Number, default: 640},
        closed: {type:Boolean, default: false}
    })),
    Puzzle: Post.discriminator("Puzzle", new mongoose.Schema({ //Weekly Puzzle Posts
        solution: String,
        answers: [{type: mongoose.Schema.Types.ObjectId, ref: "PostComment"}]
    }))
};