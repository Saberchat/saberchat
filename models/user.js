const {boolean} = require("joi");
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
    authenticated: {type: Boolean, default: false},
    authenticationToken: String,
    archived: {type: Boolean, default: false},
    receiving_emails: {type: Boolean, default: true},
    bannerUrl: {
        url: {type: String, default: 'https://wallpaper.dog/large/11001671.jpg'},
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
    displayUrl: String, //For admins to display their profiles (implement later)
    mediaFile: {
        filename: String,
        url: String,
        originalName: String,
        display: {type: Boolean, default: false}
    },
    reportedCount: {type: Number, default: 0},
    falseReportCount: {type: Number, default: 0},
    annCount: [{
        announcement: {type: mongoose.Schema.Types.ObjectId, ref: "Announcement"},
        version: String
    }],
    inbox: [{
        message: {type: mongoose.Schema.Types.ObjectId, ref: "InboxMessage"},
        new: Boolean
    }],
    newRooms: [{type: mongoose.Schema.Types.ObjectID, ref: "ChatRoom"}],
    requests: [{type: mongoose.Schema.Types.ObjectId, ref: "AccessRequest"}],
    followers: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}],
    blocked: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}],
    permission: {type: String, default: "default"},
    status: {type: String, default: "guest"},
    tags: [{type: String}],
    balance: {type: Number, default: 0},
    debt: {type: Number, default: 0},
    deposits: [{
        amount: Number,
        added: Date,
    }],
    darkmode: {type: Boolean, default: false},
    logins: [{type: Date}]
}, {timestamps: {createdAt: 'created_at'}
}).plugin(passportLocalMongoose, {usernameField: 'email'}));
