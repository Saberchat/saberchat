const express = require('express')
const router = express.Router();
const Filter = require('bad-words');
const filter = new Filter();
const nodemailer = require('nodemailer');

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

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'noreply.saberchat@gmail.com',
    pass: 'Tgy8erwIYtxRZrJHvKwkWbrkbUhv1Zr9'
  }
});

// renders the list of users page
router.get('/', middleware.isLoggedIn, (req, res) => {

  User.find({}, (err, foundUsers) => {
    if(err || !foundUsers) {
        req.flash('error', 'Unable to access Database');
        res.redirect('back');

    } else {
      res.render('profile/index', {users: foundUsers});
    }
  });
});

//renders profiles edit page
router.get('/edit', middleware.isLoggedIn, (req, res) => {
  res.render('profile/edit');
});

//renders the email/password edit page
router.get('/change-login-info', middleware.isLoggedIn, (req, res) => {
  res.render('profile/edit_pwd_email');
});

//renders views/profiles/show.ejs at /profiles route.
router.get('/:id', middleware.isLoggedIn, (req, res) => {

  (async() => {

    const user = await User.findById(req.params.id).populate('followers');

    if(!user) {
        req.flash('error', 'Error. Cannot find user.');
        return res.redirect('back');
    }

    let following = [];
    let followerIds = [];

    for (let follower of user.followers) {
      followerIds.push(follower._id);
    }

    const users = await User.find({});

    for (let u of users) {
      if (u.followers.includes(req.user._id)) {
        following.push(u);
      }
    }

    res.render('profile/show', {user, following, followerIds});

  })().catch(err => {
    console.log(err);
    req.flash('error', "Unable to access database");
    res.redirect('back');
  })
});

// update user route. Check if current user matches profiles they're trying to edit with middleware.
router.put('/profile', middleware.isLoggedIn, (req, res) => {

  (async() => {

    const overlap = await User.find({username: filter.clean(req.body.username), _id: {$nin: [req.user._id]}});

    if (!overlap) {
      req.flash('error', "Unable to find users");
      return res.redirect('back');

    } else if (overlap.length > 0) {
      req.flash('error', "Another user already has that username.");
      return res.redirect('back');
    }

    let status;

    if (req.body.status == '') {
      status = req.user.status;

    } else {
      status = req.body.status;
    }

    let user = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      username: filter.clean(req.body.username),
      description: filter.clean(req.body.description),
      title: filter.clean(req.body.title),
      status: status.toLowerCase()
    };

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

    let updateEmail = {
		  from: 'noreply.saberchat@gmail.com',
		  to: updatedUser.email,
		  subject: 'Profile Update Confirmation',
			text: `Hello ${user.firstName},\n\nYou are receiving this email because you recently made changes to your Saberchat profile.\n\nIf you did not recently make any changes, contact a faculty member immediately.`
		};

		transporter.sendMail(updateEmail, (err, info) =>{
		  if (err) {
		    console.log(err);
		  } else {
		    console.log('Email sent: ' + info.response);
		  }
		});

    req.flash('success', 'Updated your profile');
    res.redirect('/profiles/' + req.user._id);

  })().catch(err => {
    console.log(err);
    req.flash('error', "Unable to access database");
    res.redirect('back');
  });
});

//route for changing email. Similar to edit profiles route. But changing email logs out user for some reason.
router.put('/change-email', middleware.isLoggedIn, (req, res) => {
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

      let updateEmail = {
        from: 'noreply.saberchat@gmail.com',
        to: req.body.email,
        subject: 'Profile Update Confirmation',
        text: `Hello ${updatedUser.firstName},\n\nYou are receiving this email because you recently made changes to your Saberchat email. This is a confirmation of your profile.\n\nYour username is ${updatedUser.username}.\nYour full name is ${updatedUser.firstName} ${updatedUser.lastName}.\nYour email is ${req.body.email}`
      };

      transporter.sendMail(updateEmail, (err, info) =>{
        if (err) {
          console.log(err);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });

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
router.put('/change-password', middleware.isLoggedIn, (req, res) => {

    if (req.body.newPassword == req.body.newPasswordConfirm)  {
      User.findById(req.user._id, (err, foundUser) => {
        if(err || !foundUser) {
          req.flash('error', 'Error, cannot find user');
          res.redirect('/');

      } else {
        foundUser.changePassword(req.body.oldPassword, req.body.newPassword, (err) => {
          if(err) {
            req.flash('error', 'Error changing your password. Check if old password is correct.');
            res.redirect('/');

          } else {

            let updateEmail = {
              from: 'noreply.saberchat@gmail.com',
              to: req.user.email,
              subject: 'Password Update Confirmation',
              text: `Hello ${req.user.firstName},\n\nYou are receiving this email because you recently made changes to your Saberchat password. This is a confirmation of your profile.\n\nYour username is ${req.user.username}.\nYour full name is ${req.user.firstName} ${req.user.lastName}.\nYour email is ${req.user.email}\n\nIf you did not recently change your password, reset it immediately and contact a faculty member.`
            };

            transporter.sendMail(updateEmail, (err, info) =>{
              if (err) {
                console.log(err);
              } else {
                console.log('Email sent: ' + info.response);
              }
            });

            req.flash('success', 'Successfully changed your password');
            res.redirect('/profiles/' + req.user._id);
          }
        });
      }
    });

  } else {
    req.flash('error', "Passwords do not match");
    res.redirect('back');
  }
});

router.delete('/delete-account', middleware.isLoggedIn, (req, res) => {
  (async() => {

    const deletedComments = await Comment.deleteMany({author: req.user._id});

    if (!deletedComments) {
      req.flash('error', "Unable to delete your comments");
      return res.redirect('back');
    }

    const messagesSent = await Message.find({sender: req.user._id}).populate('read');

    if (!messagesSent) {
      req.flash('error', "Unable to delete your messages");
      return res.redirect('back');
    }

    for (let message of messagesSent) {
      for (let user of message.read) {
        user.msgCount -= 1;
        await user.save();
      }
    }

    const deletedMessagesSent = await Message.deleteMany({sender: req.user._id});

    if (!deletedMessagesSent) {
      req.flash('error', "Unable to delete your messages");
      return res.redirect('back');
    }

    const messagesReceived = await Message.find({});

    if (!messagesReceived) {
      req.flash('error', "Unable to delete your messages");
      return res.redirect('back');
    }

    let messageUpdate;

    for (let message of messagesReceived) {
      if (message.recipients.includes(req.user._id)) {
        messageUpdate = await Message.findByIdAndUpdate(message._id, {$pull: {recipients: req.user._id}});

        if (!messageUpdate) {
          req.flash('error', "Unable to update your messages");
          return res.redirect('back');
        }
      }
    }

    const emptyMessages = await Message.deleteMany({recipients: []});

    if (!emptyMessages) {
      req.flash('error', "Unable to delete your messages");
      return res.redirect('back');
    }

    const anns = await Announcement.find({sender: req.user._id});

    if (!anns) {
      req.flash('error', "Unable to delete your announcements");
      return res.redirect('back');
    }

    const users = await User.find({});

    for (let ann of anns) {
      for (let user of users) {
        for (let i = 0; i < user.annCount.length; i +=1) {
          if (user.annCount[i].announcement.toString() == ann._id.toString()) {
            user.annCount.splice(i, 1);
          }
        }
        await user.save();
      }
    }

    const deletedAnns = await Announcement.deleteMany({sender: req.user._id});

    if (!deletedAnns) {
      req.flash('error', "Unable to delete your announcements");
      return res.redirect('back');
    }

    const deletedArticles = await Article.deleteMany({author: req.user._id});

    if (!deletedArticles) {
      req.flash('error', "Unable to delete your articles");
      return res.redirect('back');
    }

    const deletedRequests = await Request.deleteMany({requester: req.user._id});

    if (!deletedRequests) {
      req.flash('error', "Unable to delete your requests");
      return res.redirect('back');
    }

    const orders = await Order.find({customer: req.user._id});

    if (!orders) {
      req.flash('error', "Unable to find your orders");
      return res.redirect('back');
    }

    let deletedOrder;

    for (let order of orders) {
      deletedOrder = await Order.findByIdAndDelete(order._id).populate('items.item');
      if (!deletedOrder) {
        req.flash("error", "Unable to delete orders");
        return res.redirect('back');
      }

      for (let i = 0; i < deletedOrder.items.length; i += 1) { //For each of the order's items, add the number ordered back to that item. (If there are 12 available quesadillas and our user ordered 3, there are now 15)

        if (deletedOrder.present) {
          deletedOrder.items[i].item.availableItems += deletedOrder.items[i].quantity;
          deletedOrder.items[i].item.isAvailable = true;
          await deletedOrder.items[i].item.save();
        }
      }
    }

    const roomsCreated = await Room.find({});

    if (!roomsCreated) {
      req.flash('error', "Unable to delete your rooms");
      return res.redirect('back');
    }

    let deletedRoomCreated = null;

    for (let room of roomsCreated) {
      if (room.creator.id.toString() == req.user._id.toString()) {
        deletedRoomCreated = await Room.findByIdAndDelete(room._id);

        if (!deletedRoomCreated) {
          req.flash('error', "Unable to delete your rooms");
          return res.redirect('back');
        }
      }
    }

    const roomsPartOf = await Room.find({});

    if (!roomsPartOf) {
			req.flash('error', "Unable to find your rooms");
			return res.redirect('back');
		}

		let roomUpdates = [];

		for (let room of roomsPartOf) {
			if (room.members.includes(req.user._id)) {
				roomUpdates.push(room._id);
			}
		}

		for (let room of roomUpdates) {
			updatedRoom = await Room.findByIdAndUpdate(room, {$pull: {members: req.user._id}});

			if (!updatedRoom) {
				req.flash('error', "Unable to access your rooms");
				return res.redirect('back');
			}
		}

    const deletedProjectsPosted = await Project.deleteMany({poster: req.user._id});

    if (!deletedProjectsPosted) {
      req.flash('error', "Unable to delete your projects");
      return res.redirect('back');
    }

    const projectsCreated = await Project.find({});

    if (!projectsCreated) {
      req.flash('error', "Unable to find your projects");
      return res.redirect('back');
    }

    let projectUpdates = [];

    for (let project of projectsCreated) {
      if (project.creators.includes(req.user._id)) {
        projectUpdates.push(project._id);
      }
    }

    let updatedProjectCreated;

    for (let project of projectUpdates) {
      updatedProjectCreated = await Project.findByIdAndUpdate(project, {$pull: {creators: user._id}});

      if (!updatedProjectCreated) {
        req.flash('error', "Unable to remove you from your projects");
        return res.redirect('back');
      }
    }

    const emptyProjects = await Project.deleteMany({creators: []});

    if (!emptyProjects) {
      req.flash('error', "Unable to delete your projects");
      return res.redirect('back');
    }

    const deletedUser = await User.findByIdAndDelete(req.user._id);

    if (!deletedUser) {
      req.flash('error', "There was an error deleting your account");
      return res.redirect('back');
    }

    let deleteEmail = {
      from: 'noreply.saberchat@gmail.com',
      to: deletedUser.email,
      subject: 'Profile Deletion Confirmation',
      text: `Hello ${deletedUser.firstName},\n\nYou are receiving this email because you recently deleted your Saberchat account. If you did not delete your account, contact a staff member immediately.`
    };

    transporter.sendMail(deleteEmail, (err, info) =>{
      if (err) {
        console.log(err);
      } else {
        console.log('Email sent: ' + info.response);
      }
    })

    req.flash('success', "Account deleted!");
    res.redirect('/');

  })().catch(err => {
    console.log(err);
    req.flash('error', "Unable to access database");
    res.redirect('back');
  });
});

router.get('/follow/:id', (req, res) => {
  User.findById(req.params.id, (err, user) => {
    if (err || !user) {
      req.flash('error', "Unable to find user");
      res.redirect('back');

    } else if (user.followers.includes(req.user._id)) {
      req.flash('error', `You are already following ${user.firstName} ${user.lastName}`);
      res.redirect('/profiles');

    } else if (user._id.equals(req.user._id)) {
      req.flash('error', `You may not follow yourself`);
      res.redirect('/profiles');

    } else {
      user.followers.push(req.user);
      user.save();
      req.flash('success', `You are now following ${user.firstName} ${user.lastName}!`);
      res.redirect('/profiles');

    }
  });
});

router.get('/unfollow/:id', (req, res) => {
  User.findById(req.params.id, (err, user) => {
    if (err || !user) {
      req.flash('error', "Unable to find user");
      res.redirect('back');

    } else {
      let index = -1;
      for (let i = 0; i < user.followers.length; i ++) {
        if (user.followers[i].equals(req.user._id)) {
          index = i;
        }
      }

      if (index > -1) {
        user.followers.splice(index, 1);
        user.save();
        req.flash('success', `You are no longer following ${user.firstName} ${user.lastName}.`);
        res.redirect('/profiles');

      } else {
        req.flash('error', `You do not appear to be following ${user.firstName} ${user.lastName}`);
        res.redirect('/profiles');
      }

    }
  });
});

router.get('/remove/:id', (req, res) => {

  User.findById(req.params.id, (err, user) => {
    if (err || !user) {
      req.flash('error', "Unable to find user");
      res.redirect('back');

    } else {
      if (req.user.followers.includes(user._id)) {
        req.user.followers.splice(req.user.followers.indexOf(user._id), 1);
        req.user.save();
        req.flash('success', `${user.firstName} ${user.lastName} was removed from your list of followers`);
        res.redirect(`/profiles/${req.user._id}`);

      } else {
        req.flash('error', `${user.firstName} ${user.lastName} does not appear to be following you.`);
        res.redirect('back');
      }
    }
  });
});
module.exports = router;
