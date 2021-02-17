const mongoose = require("mongoose");

var projectSchema = new mongoose.Schema({
    title: String,
    images: [{type: String}],
    imageFiles: [{
        filename: String,
        url: String,
        originalName: String
    }],
    text: String,
    date: String,
    poster: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    creators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],

    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PostComment',
        default: []
    }]

}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Project", projectSchema);
