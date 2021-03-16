const mongoose = require("mongoose");

//Comments that are sent and stored in chat rooms
module.exports = mongoose.model("Comment", new mongoose.Schema({
    text: String,
    status: {type: String, default: 'none'},
    statusBy: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    room: {type: mongoose.Schema.Types.ObjectId, ref: "Room"},
    author: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    date: String
}, {timestamps: {createdAt: 'created_at'}
}));
