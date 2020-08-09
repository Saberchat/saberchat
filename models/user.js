const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

// user will have email, pswrd, usrname, desc., url to profile pic, and timestamp
var userSchema = new mongoose.Schema({
	email: String,
	password: String,
	username: String,
	description: String,
	imageUrl: String
}, {timestamps: {createdAt: 'created_at'}});

//adds authentication functionality
userSchema.plugin(passportLocalMongoose, {usernameField: 'email'});

module.exports = mongoose.model("User", userSchema);
