// Executes before the code in HTTP route request

const Room = require("../models/room");
const user = require("../models/user");
const accessReq = require('../models/accessRequest');

//create a 'middleware' object to store middleware functions
middleware = {};

//create isLoggedIn function to check if user is logged in
middleware.isLoggedIn = function(req, res, next) {
	//authenticate user
	if(req.isAuthenticated()) {
		//stop the function by returning and proceed to next step
		return next();
	}
	//user is not logged in. Give flash message and redirect to root
	req.flash('error', 'Please Login');
	res.redirect('/');
}

//checks if user is allowed into room
middleware.checkIfMember = function(req, res, next) {
	Room.findById(req.params.id, function(err, foundRoom) {
		if(err || !foundRoom) {
			console.log(err);
			req.flash('error', 'Room cannot be found or does not exist');
			res.redirect('/chat')
		} else {
			let userId = req.user._id;
			if(foundRoom.type == 'public' || foundRoom.members.includes(userId)) {
				return next();
			}
			// stuff for when user is not member of room
			req.flash('error', 'You are not a member of this room');
			res.redirect('/chat');
		}
	});
}

// checks for if the user can leave from a room
middleware.checkForLeave = function(req, res, next) {
	Room.findById(req.params.id, function(err, foundRoom) {
		if(err || !foundRoom) {
			console.log(err);
			req.flash('error', 'Room cannot be found or does not exist');
			res.redirect('/chat')
		} else {
			if(foundRoom.type != 'private') {
				req.flash('error', 'You cannot leave a public room.');
				res.redirect('back')
			} else if(foundRoom.members.includes(req.user._id)) {
				next();
			} else {
				// stuff for when user is not member of room
				req.flash('error', 'You are not a member of this room');
				res.redirect('/chat');
			}
		}
	});
}
// check if room owner
middleware.checkRoomOwnership = function(req, res, next) {
	Room.findById(req.params.id, function(err, foundRoom) {
		if(err || !foundRoom) {
			console.log(err);
			req.flash('error', 'Room cannot be found or does not exist');
			res.redirect('/chat')
		} else {
			if(foundRoom.creator.id.equals(req.user._id)) {
				return next();
			}
			req.flash('error', 'You do not have permission to do that');
			res.redirect('/chat/' + foundRoom._id);
		}
	});
}

middleware.isAdmin = function(req, res, next) {
	if(req.user.permission == 'admin' || req.user.permission == 'principal') {
		next();
	} else {
		req.flash('error', 'You do not have permission to do that');
		res.redirect('/');
	}
}

middleware.isMod = function(req, res, next) {
	if(req.user.permission == 'mod' || req.user.permission == 'admin' || req.user.permission == 'principal') {
		next();
	} else {
		req.flash('error', 'You do not have permission to do that');
		res.redirect('/');
	}
}

//export the object with all the functions
module.exports = middleware;
