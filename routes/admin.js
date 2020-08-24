const express = require('express');
//start express router
const router = express.Router();

const Comment = require('../models/comment');
const User = require('../models/user');

const middlware = require('../middleware');


//Function to display user inbox
router.get('/', middlware.isLoggedIn, middlware.isAdmin, (req, res) => {
	res.render('admin/index');
});

router.get('/moderate', middlware.isLoggedIn, middleware.isMod, (req, res) => {
	Comment.find({status: 'flagged'})
	.populate({path: 'author', select:['username','imageUrl']})
	.populate({path:'statusBy', select:['username', 'imageUrl']})
	.exec(function(err, foundComments) {
		if(err) {
			req.flash('error', 'Cannot access DataBase');
			res.redirect('/admin');
		} else {
			res.render('admin/mod', {comments: foundComments});
			console.log(foundComments[2]);
		}
	});
});

router.get('/permissions', middlware.isLoggedIn, middlware.isAdmin, (req, res) => {
	User.find({permission: { $ne: 'principle'}}, (err, foundUsers) => {
		if(err) {
			req.flash('error', 'Cannot access Database');
			res.redirect('/admin');
		} else {
			res.render('admin/permission', {users: foundUsers});
		}
	});
});

module.exports = router;