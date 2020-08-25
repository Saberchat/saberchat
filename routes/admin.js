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
	.populate({path: 'statusBy', select:['username', 'imageUrl']})
	.populate({path: 'room', select: ['name']})
	.exec(function(err, foundComments) {
		if(err) {
			req.flash('error', 'Cannot access DataBase');
			res.redirect('/admin');
		} else {
			res.render('admin/mod', {comments: foundComments});
		}
	});
});

router.get('/permissions', middlware.isLoggedIn, middlware.isAdmin, (req, res) => {
	User.find({permission: { $ne: 'principle'}}, (err, foundUsers) => {
		if(err || !foundUsers) {
			req.flash('error', 'Cannot access Database');
			res.redirect('/admin');
		} else {
			res.render('admin/permission', {users: foundUsers});
		}
	});
});

router.put('/permissions', middlware.isLoggedIn, middlware.isAdmin, (req, res) => {
	// check if trying to change to admin
	if(req.body.role == 'admin') {
		// check if it's the principal
		if(req.user.permission == 'principal') {
			User.findByIdAndUpdate(req.body.user, {permission: req.body.role}, (err, updatedUser) => {
				if(err || !updatedUser) {
					res.json({error: 'Error. Could not change'});
				} else {
					res.json({success: 'Succesfully changed'});
				}
			});
		} else {
			res.json({error: 'You do not have permissions to do that'});
		}
	} else {
		// else continue
		User.findByIdAndUpdate(req.body.user, {permission: req.body.role}, (err, updatedUser) => {
			if(err || !updatedUser) {
				res.json({error: 'Error. Could not change'});
			} else {
				res.json({success: 'Succesfully changed'});
			}
		});
	}
	
});

module.exports = router;