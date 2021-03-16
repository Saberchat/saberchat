const mongoose = require("mongoose");

//Superclass group schema, to be implemented with chat rooms, courses, etc.
module.exports = mongoose.model("Group", new mongoose.Schema({
    name: String,
    description: {type: String, default: ""},
    private: {type: Boolean, default: false},
    date: String,
    members: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}],
    creator: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
}, {timestamps: {createdAt: 'created_at'}
}));

//TODO: Add chat rooms, courses and cafes as subclasses