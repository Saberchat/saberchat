const mongoose = require("mongoose");

//comment will have text, author id, author username, and a timestamp for when it was created.

var commentSchema = new mongoose.Schema({
    text: String,
    status: {type: String, default: 'none'},
    statusBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room"
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    date: String
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Comment", commentSchema);
