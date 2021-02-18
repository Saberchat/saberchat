const mongoose = require('mongoose');

var announcementSchema = new mongoose.Schema({
    subject: String,
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    images: [{type: String}],
    imageFiles: [{
        filename: String,
        url: String,
        originalName: String
    }],
    text: String,
    date: String,
    likes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'PostComment'}]
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Announcement", announcementSchema);
