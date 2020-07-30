const mongoose = require("mongoose");

var commentSchema = new mongoose.Schema({
    text: String
	// author: {
	// 	id: {
	// 		type: mongoose.Schema.Types.ObjectId,
	// 		ref: "User"
	// 	},
	// 	username: String
    // }
    // author: String
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Comment", commentSchema);