// Executes before the code in HTTP route request

const Room = require("../models/room");
const user = require("../models/user");

//create a 'middleware' object to store middleware functions
middlewareObj = {};

//create isLoggedIn function to check if user is logged in
middlewareObj.isLoggedIn = function(req, res, next) {
	//authenticate user
	if(req.isAuthenticated()) {
		//stop the function by returning and proceed to next step
		return next();
	}
	//user is not logged in. Give flash message and redirect to root
	req.flash('error', 'Please Log In');
	res.redirect('/');
}

//checks if user is allowed into room
middlewareObj.checkIfMember = function(req, res, next) {
	Room.findById(req.params.id, function(err, foundRoom) {
		if(err || !foundRoom) {
			console.log(err);
			req.flash('error', 'Room cannot be found or does not exist');
			res.redirect('/chat')
		} else {
			let userId = req.user._id;
			if(foundRoom.members.includes(userId)) {
				return next();
			}
			// stuff for when user is not member of room
			req.flash('error', 'You are not a member of this room');
			res.redirect('/chat');
		}
	})
}

//export the object with all the functions
module.exports = middlewareObj;
