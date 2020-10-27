const express = require('express')
const router = express.Router();
const Filter = require('bad-words');
const filter = new Filter();

const User = require('../models/user');
const Email = require('../models/email');

const Comment = require('../models/comment');
const Room = require('../models/room');
const Request = require('../models/accessRequest');

const Message = require('../models/message');
const Announcement = require('../models/announcement');
const Project = require('../models/project');

const Order = require('../models/order');
const Article = require('../models/article');

const middleware = require('../middleware');

// renders the list of users page
router.get('/', middleware.isLoggedIn, function(req, res) {

  User.find({}, function(err, foundUsers) {
    if(err || !foundUsers) {
        req.flash('error', 'Unable to access Database');
        res.redirect('back');

    } else {
      res.render('profile/index', {users: foundUsers})
    }
  });
});

//renders profiles edit page
router.get('/edit', middleware.isLoggedIn, function(req, res) {
  res.render('profile/edit')
});

//renders the email/password edit page
router.get('/change-login-info', middleware.isLoggedIn, function(req, res) {
  res.render('profile/edit_pwd_email')
});

//renders views/profiles/show.ejs at /profiles route.
router.get('/:id', middleware.isLoggedIn, function(req, res) {
  User.findById(req.params.id, function(err, foundUser) {
    if(err || !foundUser) {
        req.flash('error', 'Error. Cannot find user.');
        res.redirect('back');

    } else {
      res.render('profile/show', {user: foundUser})
    }
  });
});

// update user route. Check if current user matches profiles they're trying to edit with middleware.
router.put('/profile', middleware.isLoggedIn, function(req, res) {

  (async() => {

    const overlap = await User.find({username: filter.clean(req.body.username), _id: {$nin: [req.user._id]}});

    if (!overlap) {
      req.flash('error', "Unable to find users");
      return res.redirect('back');

    } else if (overlap.length > 0) {
      req.flash('error', "Another user already has that username.");
      return res.redirect('back');
    }

    let user = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      username: filter.clean(req.body.username),
      description: filter.clean(req.body.description),
      title: filter.clean(req.body.title),
      status: req.body.status
    }

    if(req.body.imageUrl) {
        user.imageUrl = req.body.imageUrl;
    }
    if(req.body.bannerUrl) {
        user.bannerUrl = req.body.bannerUrl;
    }


    //find and update the user with new info
    const updatedUser = await User.findByIdAndUpdate(req.user._id, user);

    if(!updatedUser) {
      req.flash('error', 'There was an error updating your profile');
      return res.redirect('back');
    }

    req.flash('success', 'Updated your profile');
    res.redirect('/profiles/' + req.user._id);

  })().catch(err => {
    console.log(err);
    req.flash('error', "Unable to access database");
    res.redirect('back');
  })
});

//route for changing email. Similar to edit profiles route. But changing email logs out user for some reason.
router.put('/change-email', middleware.isLoggedIn, function(req, res) {
  (async() => {

    const emails = await Email.find({address: req.body.email});

    if (!emails) {
      req.flash('error', "Unable to find emails");
      return res.redirect('back');

    } else if (emails.length < 1) {
      req.flash('error', "That email is not in our whitelist");
      return res.redirect('back');
    }

    const overlap = await User.find({email: req.body.email, _id: {$nin: [req.user._id]}});

    if (!overlap) {
      req.flash('error', "Unable to find users");
      return res.redirect('back');

    } else if (overlap.length > 0) {
      req.flash('error', "Another user already has that email.");
      return res.redirect('back');
    }

    const updatedUser = await  User.findByIdAndUpdate(req.user._id, {email: req.body.email});

    if(!updatedUser) {
      req.flash('error', 'There was an error changing your email');
      res.redirect('/');

    } else {
      req.flash('success', 'Updated your profile. Please Login Again.');
      res.redirect('/');
    }

  })().catch(err => {
    console.log(err);
    req.flash('error', "Unable to access database");
    res.redirect('back');
  });
});

//route for changing password. Not too much different from previous routes.
router.put('/change-password', middleware.isLoggedIn, function(req, res) {
    User.findById(req.user._id, function(err, foundUser) {
      if(err || !foundUser) {
        req.flash('error', 'Error, cannot find user');
        res.redirect('/');
    } else {
      foundUser.changePassword(req.body.oldPassword, req.body.newPassword, function(err) {
        if(err) {
          req.flash('error', 'Error changing your password. Check if old password is correct.');
          res.redirect('/');
        } else {
          req.flash('success', 'Successfully changed your password');
          res.redirect('/profiles/' + req.user._id);
        }
      });
    }
  });
});

// router.delete('/delete-account', middleware.isLoggedIn, (req, res) => {
//   (async() => {
//
//     const deletedComments = await Comment.deleteMany({author: req.user._id});
//
//     if (!deletedComments) {
//       req.flash('error', "Unable to delete your comments");
//       return res.redirect('back');
//     }
//
//     const deletedMessages = await Message.deleteMany({sender: req.user._id});
//
//     if (!deletedMessages) {
//       req.flash('error', "Unable to delete your messages");
//       return res.redirect('back');
//     }
//
//     const deletedAnns = await Announcement.deleteMany({sender: req.user._id});
//
//     if (!deletedAnns) {
//       req.flash('error', "Unable to delete your announcements");
//       return res.redirect('back');
//     }
//
//     const deletedRooms = await Room.deleteMany({creator: req.user._id});
//
//     if (!deletedRooms) {
//       req.flash('error', "Unable to delete your rooms");
//       return res.redirect('back');
//     }
//
//     const deletedArticles = await Article.deleteMany({author: req.user._id});
//
//     if (!deletedArticles) {
//       req.flash('error', "Unable to delete your articles");
//       return res.redirect('back');
//     }
//
//     const deletedRequests = await Request.deleteMany({requester: req.user._id});
//
//     if (!deletedRequests) {
//       req.flash('error', "Unable to delete your requests");
//       return res.redirect('back');
//     }
//
//     const deletedOrders = await Order.deleteMany({customer: req.user._id});
//
//     if (!deletedOrders) {
//       req.flash('error', "Unable to delete your orders");
//       return res.redirect('back');
//     }
//
//     const deletedProjectsPosted = await Project.deleteMany({poster: req.user._id});
//
//     if (!deletedProjectsPosted) {
//       req.flash('error', "Unable to delete your projects");
//       return res.redirect('back');
//     }
//
//     const projectsCreated = await Project.find({});
//
//     if (!projectsCreated) {
//       req.flash('error', "Unable to find your projects");
//       return res.redirect('back');
//     }
//
//     let deletes = []
//
//     for (let project of projects) {
//       if (project.creators.includes(req.user._id)) {
//         deletes.push(req.user._id);
//       }
//     }
//
//     const deletedProjectsCreated = await Project.deleteMany({_id: {$in: deletes}})
//
//     if (!deletedProjectsCreated) {
//       req.flash('error', "Unable to delete your projects");
//       return res.redirect('back');
//     }
//
//     const deletedUser = await User.findByIdAndDelete(req.user._id);
//
//     if (!deletedUser) {
//       req.flash('error', "There was an error deleting your account");
//       return res.redirect('back');
//     }
//
//     req.flash('success', "Account deleted!");
//     res.redirect('/')
//   })
// })

module.exports = router;
