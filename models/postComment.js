const mongoose = require('mongoose');

const postCommentSchema = new mongoose.Schema({
    text: String,
    sender: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    date: String,
    likes: [{type: mongoose.Schema.Types.ObjectId, ref: 'User', default: []}]
}, {
    timestamps: {createdAt: 'created_at'}
});

module.exports = mongoose.model("PostComment", postCommentSchema);
