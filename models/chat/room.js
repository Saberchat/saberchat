const mongoose = require("mongoose");

// room will have name, list of members, and info on the creator
var roomSchema = new mongoose.Schema({
    name: String,
    description: {type: String, default: "No description."},
    private: {type: Boolean, default: false},
    date: String,
    members: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}],
    confirmed: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}],
    creator: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    moderate: {type: Boolean, default: true},
    mutable: {type: Boolean, default: true}
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Room", roomSchema);
