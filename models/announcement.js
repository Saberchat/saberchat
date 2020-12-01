const mongoose = require('mongoose');

var announcementSchema = new mongoose.Schema({
    subject: String,
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    images: [{type: String}],
    text: String,
    date: String,

    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: []
    }],

    comments: [{
      text: String,
      sender: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
      date: String,
      default: []
    }]

}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Announcement", announcementSchema);
