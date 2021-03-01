const mongoose = require('mongoose');

const postCommentSchema = new mongoose.Schema({
    type: {type: String, default: "comment"},
    subject: String,
    text: String,
    sender: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    date: String,
    likes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'PostComment'}],
    handled: {type: Boolean, default: false} //Only for bug reports
}, {
    timestamps: {createdAt: 'created_at'}
});

module.exports = mongoose.model("PostComment", postCommentSchema);
