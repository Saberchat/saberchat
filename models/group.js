const mongoose = require("mongoose");

//Superclass group schema, to be implemented with chat rooms, courses, etc.
var groupSchema = new mongoose.Schema({
    name: String,
    description: {type: String, default: "No description."},
    private: {type: Boolean, default: false},
    date: String,
    members: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}],
    creator: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Group", groupSchema);
