const express = require('express');

//create express router
const router = express.Router();

//import middleware
const middleware = require('../middleware');

//import comment schema for db stuff
const Comment = require('../models/comment');
const User = require('../models/user');
const Room = require('../models/room');

//route for displaying chats
router.get('/chat', middleware.isLoggedIn, (req, res) => {
	Room.find({}, function(err, foundRooms) {
		if(err || !foundRooms) {
            req.flash('error', 'Unable to access Database');
            res.redirect('back');
        } else {
            res.render('chat/index', {rooms: foundRooms});
        }
	});
});

//route for desplaying new room form
router.get('/chat/new', middleware.isLoggedIn, (req, res) => {
	User.find({}, function(err, foundUsers) {
    if(err || !foundUsers) {
      req.flash('error', 'Unable to access Database');
      res.redirect('back');
    } else {
      res.render('chat/new', {users: foundUsers});
    }
  });
});

// stuff for /chat route. Middleware makes sure user is logged in and allowed in chat group.
router.get('/chat/:id', middleware.isLoggedIn, middleware.checkIfMember, (req, res) => {
	//finds all comments in the db
	Comment.find({room: req.params.id}, function(err, foundComments){
		if(err){
			//log error and flash message if it can't access the comments in db
      console.log(err);
      req.flash('error', 'Comments could not be loaded');
		} else {
			if(!foundComments){
				//if there are no comments in db
				console.log('no found comments!');
			}
			//renders views/chat/index.ejs and passes in data
			res.render('chat/show', {comments: foundComments, room: req.params.id});
		}
	});
});

// route for creating new rooms
router.post('/chat/new', middleware.isLoggedIn, function(req, res) {
	Room.create({name: req.body.name}, function(err, room) {
		if(err) {
			console.log(err);
			req.flash('error', 'group could not be created');
			res.redirect('/chat/new');
		} else {
			for(const user in req.body.check) {
				room.members.push(user);
			}
			room.members.push(req.user._id);
			room.creator.id = req.user._id;
			room.creator.username = req.user.username;
			room.save()
			console.log('Database Room created: '.cyan);
			console.log(room);
			res.redirect('/chat');
		}
	});
});

router.get('/chat/edit-form/:id', middleware.isLoggedIn, (req, res) => {
	var users;
	User.find({}, function(err, foundUsers) {
    if(err || !foundUsers) {
      req.flash('error', 'Unable to access Database');
      res.redirect('back');
    } else {
      users = foundUsers;
    }
  });
	Room.findById(req.params.id, function(err, foundRoom) {
		if(err || !foundRoom) {
      req.flash('error', 'Unable to access Database');
      res.redirect('back');
    } else {
      res.render('chat/edit', {users: users, room: foundRoom});
    }
	});
});

router.put('/chat/:id/edit', middleware.isLoggedIn, (req, res) => {
	var query = { name: req.body.newname }
	var rooms;
	Room.find({}, function(err, foundRooms) {
		if(err || !foundRooms) {
        req.flash('error', 'Unable to access Database');
        res.redirect('back');
      } else {
				rooms = foundRooms;
      }
	});
	Room.findByIdAndUpdate(req.params.id, query, function(err, room) {
		if (err || !room) {
			req.flash('error', 'Unable to access Database');
			res.redirect('back');
		} else {
			// for(const user in req.body.check) {
			// 	room.members.push(user);
			// }
			req.flash('success', 'Updated your group');
			res.redirect('/chat');
		}
	});
	// res.send(req.params.id + " " + req.body.newname);
});

//export the router with all the routes connected
module.exports = router;
