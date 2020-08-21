const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

// user will have email, pswrd, name, desc., title, url to profile pic, and timestamp
var userSchema = new mongoose.Schema({
	username: String,
	email: String,
	password: String,
	firstName: String,
	lastName:String,
	description: String,
	title: String,
	bannerUrl: {type: String, default: 'https://images.unsplash.com/photo-1594793861747-136c34047e9d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1952&q=80'},
	imageUrl: {type: String, default: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png'},
	notifCount: Number,
	inbox: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Notification"
		}
	],
	permission: {type: String, default: "student"}
}, {timestamps: {createdAt: 'created_at'}});

//adds authentication functionality
userSchema.plugin(passportLocalMongoose, {usernameField: 'email'});

module.exports = mongoose.model("User", userSchema);
