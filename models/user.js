const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

// Users that have accounts on the platform
module.exports = mongoose.model("User", new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    tempPwd: String,
    firstName: String,
    lastName: String,
    description: {type: String, default: ""},
    title: {type: String, default: ""},
    authenticated: Boolean,
    authenticationToken: String,
    receiving_emails: {type: Boolean, default: true},
    bannerUrl: {
        url: {type: String, default: 'https://i.imgur.com/Wnbn7Ei.gif'},
        display: {type: Boolean, default: true}
    },
    bannerFile: {
        filename: String,
        url: String,
        originalName: String,
        display: {type: Boolean, default: false}
    },
    imageUrl: {
        url: {type: String, default: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png'},
        display: {type: Boolean, default: true}
    },
    mediaFile: {
        filename: String,
        url: String,
        originalName: String,
        display: {type: Boolean, default: false}
    },
    reportedCount: {type: Number, default: 0},
    falseReportCount: {type: Number, default: 0},
    msgCount: {type: Number, default: 0}, //REMOVE
    annCount: [{
        announcement: {type: mongoose.Schema.Types.ObjectId, ref: "Announcement"},
        version: String
    }],
    newRoomCount: [{type: mongoose.Schema.Types.ObjectID, ref: "ChatRoom"}],
    reqCount: {type: Number, default: 0}, //REMOVE
    inbox: [{type: mongoose.Schema.Types.ObjectId, ref: "InboxMessage"}], //REPLACE WITH OBJECT LIKE ANNCOUNT
    requests: [{type: mongoose.Schema.Types.ObjectId, ref: "AccessRequest"}], //REPLACE WITH OBJECT LIKE ANNCOUNT
    followers: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}],
    permission: {type: String, default: "default"},
    status: {type: String, default: "guest"},
    tags: [{type: String}],
    balance: {type: Number, default: 0},
    debt: {type: Number, default: 0},
    darkmode: {type: Boolean, default: false},
    logins: [{type: Date}]
}, {timestamps: {createdAt: 'created_at'}
}).plugin(passportLocalMongoose, {usernameField: 'email'}));
