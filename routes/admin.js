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

		const users = await User.find({email: email.address});

		if (!users) {
			req.flash('error', "Unable to find users with this email");
			return res.redirect('back');
		}

		let deletedUser;

		for (let user of users) {
			deletedUser = await User.findByIdAndDelete(user._id);

			if (!deletedUser) {
				req.flash('error', "Unable to delete users with this email");
				return res.redirect('back');
			}
		}

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
