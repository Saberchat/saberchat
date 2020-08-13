const mongoose = require("mongoose");
//comment will have text, author id, author username, and a timestamp for when it was created.
var commentSchema = new mongoose.Schema({
	text: String,
	room: String,
	author: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User"
	}
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Comment", commentSchema);
