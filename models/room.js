const mongoose = require("mongoose");

// room will have name, list of members, and info on the creator
var roomSchema = new mongoose.Schema({
  name: String,
  description: { type:String, default: "No description."},
  type: {type: String, default: 'public'},
	members: [
    {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		}
  ],
  confirmed: [
    {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		}
  ],
  creator: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    username: String
  }
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model("Room", roomSchema);
