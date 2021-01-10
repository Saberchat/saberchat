const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

// user will have email, pswrd, name, desc., title, url to profile pic, and timestamp
var userSchema = new mongoose.Schema({
	username: String,
	email: String,
	password: String,
	tempPwd: String,
	firstName: String,
	lastName:String,
	description: String,
	title: String,
	authenticated: Boolean,
	authenticationToken: String,
	receiving_emails: {type: Boolean, default: true},
	bannerUrl: {type: String, default: 'https://i.imgur.com/Wnbn7Ei.gif'},
	imageUrl: {type: String, default: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png'},
	msgCount: {type:Number, default: 0},
	annCount: [
		{
			announcement: {type: mongoose.Schema.Types.ObjectId,ref: "Announcement"},
			version: String
		}
	],
	newRoomCount: [
		{
			room: {type: mongoose.Schema.Types.ObjectID, ref: "Room"},
			version: String
		}
	],
	reqCount: {type: Number, default: 0},
	inbox: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Message"
		}
	],
	requests: [
		{
			type:mongoose.Schema.Types.ObjectId,
			ref: "AccessRequest"
		}
	],
	followers: [
		{

		type:mongoose.Schema.Types.ObjectId,
		ref: "User",
		default: []

		}
	],
	permission: {type: String, default: "student"}, // for permissions
	status: {type: String, default: "guest"}, // 7th, 8th, 9th, 10th, 11th, 12th, alumni, parents, faculty, cashier, editor, tutor, etc.
	tags: [{type: String, default: []}], //Cashier, Editor, Tutor, Etc.
	balance: {type: Number, default: 0},
	debt: {type: Number, default: 0},
	darkmode: {type: Boolean, default: false}
}, {timestamps: {createdAt: 'created_at'}});

//adds authentication functionality
userSchema.plugin(passportLocalMongoose, {usernameField: 'email'});

module.exports = mongoose.model("User", userSchema);
