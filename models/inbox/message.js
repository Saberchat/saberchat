const mongoose = require('mongoose');

var messageSchema = new mongoose.Schema({
    subject: String,
    images: [{type: String}],
    imageFiles: [{
        filename: String,
        url: String,
        originalName: String
    }],
    read: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    sender: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    recipients: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    text: String,
    toEveryone: {type: Boolean, default: false},
    anonymous: {type: Boolean, default: false},
    noReply: {type: Boolean, default: false},
    date: String,
    replies: [{
        sender: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
        text: String,
        images: [{type: String}],
        date: String
    }]
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Message", messageSchema);