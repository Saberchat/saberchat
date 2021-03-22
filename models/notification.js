const mongoose = require("mongoose");

//Comments that are sent and stored in chat rooms
const Notification = mongoose.model("Notification", new mongoose.Schema({
    text: String,
    recipients: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    author: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    status: {type: String, default: 'none'},
    images: [{type: String}],
    mediaFiles: [{
        filename: String,
        url: String,
        originalName: String
    }],
    read: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    date: String
}, {
    timestamps: {createdAt: 'created_at'},
    discriminatorKey: "type"
}));

module.exports = { //All subclass Schema

    //SUBCLASSES WITH APPENDED FIELDS
    ChatMessage: Notification.discriminator("ChatMessage", new mongoose.Schema({ //Chat room comments
        statusBy: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    })),
    AccessRequest: Notification.discriminator("AccessRequest", new mongoose.Schema({ //Chat room join requests
        room: {type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom'}
    })),
    InboxMessage: Notification.discriminator("InboxMessage", new mongoose.Schema({ //Inbox notifications
        subject: String,
        toEveryone: {type: Boolean, default: false},
        anonymous: {type: Boolean, default: false},
        noReply: {type: Boolean, default: false},
        replies: [{
            author: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
            text: String,
            images: [{type: String}],
            mediaFiles: [{
                filename: String,
                url: String,
                originalName: String
            }],
            date: String
        }]
    })),
}
