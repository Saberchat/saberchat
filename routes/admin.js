const express = require('express');
//start express router
const router = express.Router();

const Comment = require('../models/comment');
const User = require('../models/user');
const Email = require('../models/email');

const middleware = require('../middleware');


//Function to display user inbox
router.get('/', middleware.isLoggedIn, middleware.isAdmin, (req, res) => {
	 res.render('admin/index')
})

// displays moderator page
router.get('/moderate', middleware.isLoggedIn, middleware.isMod, (req, res) => {
	Comment.find({status: 'flagged'})
	.populate({path: 'author', select:['username','imageUrl']})
	.populate({path: 'statusBy', select:['username', 'imageUrl']})
	.populate({path: 'room', select: ['name']})
	.exec(function(err, foundComments) {
		if(err) {
			req.flash('error', 'Cannot access DataBase');
			res.redirect('/admin');

		} else {
		  res.render('admin/mod', {comments: foundComments})
		}
	});
});

// displays permissions page
router.get('/permissions', middleware.isLoggedIn, middleware.isAdmin, (req, res) => {
	User.find({permission: { $ne: 'principle'}}, (err, foundUsers) => {
		if(err || !foundUsers) {
			req.flash('error', 'Cannot access Database');
			res.redirect('/admin');

		} else {
		  res.render('admin/permission', {users: foundUsers})
		}
	});
});

// displays status page
router.get('/status', middleware.isLoggedIn, middleware.isAdmin, (req, res) => {
	User.find({permission: { $ne: 'principle'}}, (err, foundUsers) => {
		if(err || !foundUsers) {
			req.flash('error', 'Cannot access Database');
			res.redirect('/admin');
		} else {
			res.render('admin/status', {users: foundUsers})
		}
	});
});

router.get('/whitelist', middleware.isLoggedIn, middleware.isPrincipal, (req, res) => {
	(async() => {
		const emails = await Email.find({name: {$nin: [req.user.email]}});

		if (!emails) {
			req.flash('error', "Unable to find emails");
			return res.redirect('back');
		}

		const users = await User.find({});

		if (!users) {
			req.flash('error', "Unable to find users");
			return res.redirect('back');
		}

		res.render('admin/whitelist', {emails, users});

	})().catch(err => {
		console.log(err);
		req.flash('error', "Unable to access database");
		res.redirect('back');
	})
})

router.post('/whitelist', middleware.isLoggedIn, middleware.isPrincipal, (req, res) => {

	(async() => {
		const overlap = await Email.find({address: req.body.address});

		if (!overlap) {
			req.flash('error', "Unable to find emails");
			return res.redirect('back');

		} else if (overlap.length > 0) {
			req.flash('error', "Email already in whitelist");
			return res.redirect('back');
		}

		const email = await Email.create({address: req.body.address});
		req.flash('success', "Email added!")
		res.redirect('/admin/whitelist')


	})().catch(err => {
		console.log(err);
		req.flash('error', "Unable to access database");
		res.redirect('back');
	})
})

router.delete('/whitelist/:id', middleware.isLoggedIn, middleware.isPrincipal, (req, res) => {
	(async() => {
		const email = await Email.findByIdAndDelete(req.params.id);

		if (!email) {
			req.flash('error', "Unable to remove email from database");
			return res.redirect('back');
		}

		const deletedUsers = await User.deleteMany({email: email.address});

		if (!deletedUsers) {
			req.flash('error', "Unable to delete users with this email");
			return res.redirect('back');
		}

		// let deletedComments = null;
		// let deletedMessages = null;
		// let deletedAnns = null;
		// let deletedRooms = null;
		// let deletedArticles = null;
		// let deletedRequests = null;
		// let deletedOrders = null;
		// let deletedProjectsPosted = null;
		// let projectsPosted = null;
		// let deletedProjectsCreated = null;
		//
		// for (let user of deletedUsers) {
		// 	deletedComments = await Comment.deleteMany({author: user._id});
		//
		//  if (!deletedComments) {
		// 	 req.flash('error', "Unable to delete your comments");
		// 	 return res.redirect('back');
		//  }
		//
		// 	deletedMessages = await Message.deleteMany({sender: user._id});
		//
		//  if (!deletedMessages) {
		// 	 req.flash('error', "Unable to delete your messages");
		// 	 return res.redirect('back');
		//  }
		//
		// 	deletedAnns = await Announcement.deleteMany({sender: user._id});
		//
		//  if (!deletedAnns) {
		// 	 req.flash('error', "Unable to delete your announcements");
		// 	 return res.redirect('back');
		//  }
		//
		// 	deletedRooms = await Room.deleteMany({creator: user._id});
		//
		//  if (!deletedRooms) {
		// 	 req.flash('error', "Unable to delete your rooms");
		// 	 return res.redirect('back');
		//  }
		//
		// 	deletedArticles = await Article.deleteMany({author: user._id});
		//
		//  if (!deletedArticles) {
		// 	 req.flash('error', "Unable to delete your articles");
		// 	 return res.redirect('back');
		//  }
		//
		// 	deletedRequests = await Request.deleteMany({requester: user._id});
		//
		//  if (!deletedRequests) {
		// 	 req.flash('error', "Unable to delete your requests");
		// 	 return res.redirect('back');
		//  }
		//
		// 	deletedOrders = await Order.deleteMany({customer: user._id});
		//
		//  if (!deletedOrders) {
		// 	 req.flash('error', "Unable to delete your orders");
		// 	 return res.redirect('back');
		//  }
		//
		// 	deletedProjectsPosted = await Project.deleteMany({poster: user._id});
		//
		//  if (!deletedProjectsPosted) {
		// 	 req.flash('error', "Unable to delete your projects");
		// 	 return res.redirect('back');
		//  }
		//
		// 	projectsCreated = await Project.find({});
		//
		//  if (!projectsCreated) {
		// 	 req.flash('error', "Unable to find your projects");
		// 	 return res.redirect('back');
		//  }
		//
		//  deletes = []
		//
		//  for (let project of projects) {
		// 	 if (project.creators.includes(user._id)) {
		// 		 deletes.push(user._id);
		// 	 }
		//  }
		//
		// 	deletedProjectsCreated = await Project.deleteMany({_id: {$in: deletes}})
		//
		//  if (!deletedProjectsCreated) {
		// 	 req.flash('error', "Unable to delete your projects");
		// 	 return res.redirect('back');
		//  }
		// }

		req.flash('success', "Email Removed From Whitelist! Any users with this email have been removed.");
		res.redirect('/admin/whitelist');

	})().catch(err => {
		console.log(err);
		req.flash('error', "Unable to access database");
		res.redirect('back');
	})
})

// changes permissions
router.put('/permissions', middleware.isLoggedIn, middleware.isAdmin, (req, res) => {
	// check if trying to change to admin

	if(req.body.role == 'admin' || req.body.role == "principal") {
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
		User.findById(req.body.user, (err, user) => {
			if (user.permission == 'principal' && req.user.permission != "principal") {
				res.json({error: 'You do not have permissions to do that'});

			} else {
				User.findByIdAndUpdate(req.body.user, {permission: req.body.role}, (err, updatedUser) => {
					if(err || !updatedUser) {
						res.json({error: 'Error. Could not change'});
					} else {
						res.json({success: 'Succesfully changed'});
					}
				});
			}
		})
	}

});

// changes status
router.put('/status', middleware.isLoggedIn, middleware.isAdmin, (req, res) => {
	User.findByIdAndUpdate(req.body.user, {status: req.body.status}, (err, updatedUser) => {
		if(err || !updatedUser) {
			res.json({error: 'Error. Could not change'});
		} else {
			res.json({success: 'Succesfully changed'});
		}
	});

});

// route for ignoring reported comments
router.put('/moderate', middleware.isLoggedIn, middleware.isMod, (req, res) => {
	Comment.findByIdAndUpdate(req.body.id, {status: 'ignored'}, (err, updatedComment) => {
		if(err || !updatedComment) {
			res.json({error: 'Could not update comment'});
		} else {
			res.json({success: 'Updated comment'});
		}
	});
});

// route for deleting reported comments
router.delete('/moderate', middleware.isLoggedIn, middleware.isMod, (req, res) => {
	Comment.findByIdAndUpdate(req.body.id, {status: 'deleted'}, (err, updatedComment) => {
		if(err || !updatedComment) {
			res.json({error: 'Could not update comment'});
		} else {
			res.json({success: 'Updated comment'});
		}
	});
});

router.get('/manageCafe', middleware.isLoggedIn, middleware.isMod, (req, res) => {
	res.redirect('/cafe/manage');
})

module.exports = router;
