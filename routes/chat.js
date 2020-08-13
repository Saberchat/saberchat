const express = require('express');

//create express router
const router = express.Router();

//import middleware
const middleware = require('../middleware');

//import comment schema for db stuff
const Comment = require('../models/comment');

router.get('/chat', middleware.isLoggedIn, (req, res) => {
	res.render('chat/index');
});

// stuff for /chat route. Middleware makes sure user is logged in.
router.get('/chat/:id', middleware.isLoggedIn, (req, res) => {
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

//export the router with all the routes connected
module.exports = router;
