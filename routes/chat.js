const express = require('express');

//create express router
const router = express.Router();

//import middleware
const middleware = require('../middleware');

//import comment schema for db stuff
const Comment = require('../models/comment');

// stuff for /chat route. Middleware makes sure user is logged in.
router.get('/chat', middleware.isLoggedIn, (req, res) => {
	//finds all comments in the db
	Comment.find({}, function(err, foundComments){
		if(err){
			//log error to console and flash message if cannot access comments in db
            console.log(err);
            req.flash('error', 'Comments could not be loaded');
		} else {
			if(!foundComments){
				//stuff for if there are no comments in db
				console.log('no found comments!');
			}
			//renders views/chat/index.ejs and passes in comments as 'comments'
			res.render('chat/index', {comments: foundComments});
		}
	});
});
//export the router with all the routes connected
module.exports = router;