const mongoose = require('mongoose');

var notificationSchema = new mongoose.Schema({
    subject: String,
    images: [{type: String}],
    read: [{type: Boolean}],
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    recipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    recipient_names: [{type: String}],
    recipient_ids: [{type: String}],

    text: String,
    toEveryone: Boolean,
    date: String,
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Notification", notificationSchema);
