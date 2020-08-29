const mongoose = require('mongoose');

var announcementSchema = new mongoose.Schema({
    // type: String,
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    text: String
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Announcement", announcementSchema);
