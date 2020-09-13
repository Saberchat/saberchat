const express = require('express');
//start express router
const router = express.Router();

const Comment = require('../models/comment');
const User = require('../models/user');
const Announcement = require('../models/announcement')

const middlware = require('../middleware');


//Function to display user inbox
router.get('/', middlware.isLoggedIn, middlware.isAdmin, (req, res) => {
	Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
    if (err || !foundAnns) {
      req.flash('error', 'Unable to access database')
      res.redirect('back')

    } else {

      res.render('admin/index', {announcements: foundAnns.reverse(), announced: false})
    }
  })
})

// displays moderator page
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

			Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
		    if (err || !foundAnns) {
		      req.flash('error', 'Unable to access database')
		      res.redirect('back')

		    } else {

		      res.render('admin/mod', {comments: foundComments, announcements: foundAnns.reverse(), announced: false})
		    }
		  })
		}
	});
});

// displays permissions page
router.get('/permissions', middlware.isLoggedIn, middlware.isAdmin, (req, res) => {
	User.find({permission: { $ne: 'principle'}}, (err, foundUsers) => {
		if(err || !foundUsers) {
			req.flash('error', 'Cannot access Database');
			res.redirect('/admin');
		} else {

			Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
		    if (err || !foundAnns) {
		      req.flash('error', 'Unable to access database')
		      res.redirect('back')

		    } else {

		      res.render('admin/permission', {users: foundUsers, announcements: foundAnns.reverse(), announced: false})
		    }
		  })
		}
	});
});

// displays status page
router.get('/status', middlware.isLoggedIn, middlware.isAdmin, (req, res) => {
	User.find({permission: { $ne: 'principle'}}, (err, foundUsers) => {
		if(err || !foundUsers) {
			req.flash('error', 'Cannot access Database');
			res.redirect('/admin');
		} else {

			Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
		    if (err || !foundAnns) {
		      req.flash('error', 'Unable to access database')
		      res.redirect('back')

		    } else {

		      res.render('admin/status', {users: foundUsers, announcements: foundAnns.reverse(), announced: false})
		    }
		  })
		}
	});
});

// changes permissions
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

// changes status
router.put('/status', middlware.isLoggedIn, middlware.isAdmin, (req, res) => {
	// check if trying to change to admin
	if(req.body.role == 'admin') {
		// check if it's the principal
		if(req.user.permission == 'principal') {
			User.findByIdAndUpdate(req.body.user, {permission: req.body.status}, (err, updatedUser) => {
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
		User.findByIdAndUpdate(req.body.user, {status: req.body.status}, (err, updatedUser) => {
			if(err || !updatedUser) {
				res.json({error: 'Error. Could not change'});
			} else {
				res.json({success: 'Succesfully changed'});
			}
		});
	}

});

router.put('/moderate', middlware.isLoggedIn, middlware.isMod, (req, res) => {
	Comment.findByIdAndUpdate(req.body.id, {status: 'ignored'}, (err, updatedComment) => {
		if(err || !updatedComment) {
			res.json({error: 'Could not update comment'});
		} else {
			res.json({success: 'Updated comment'});
		}
	});
});

router.delete('/moderate', middlware.isLoggedIn, middlware.isMod, (req, res) => {
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
