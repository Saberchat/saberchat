const mongoose = require('mongoose');

var notificationSchema = new mongoose.Schema({
    subject: String,
    images: [{type: String}],
    recipients: [{type: String}],
    read: [{type: Boolean}],
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    text: String,
    date: String,
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Notification", notificationSchema);
