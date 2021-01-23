const express = require('express');
//start express router
const router = express.Router();
const nodemailer = require('nodemailer');
const {transport, transport_mandatory} = require("../transport");

const User = require('../models/user');
const Email = require('../models/email');

const Comment = require('../models/comment');
const Room = require('../models/room');
const Request = require('../models/accessRequest');

const Message = require('../models/message');
const Announcement = require('../models/announcement');
const Project = require('../models/project');
const Course = require('../models/course');

const Order = require('../models/order');
const Article = require('../models/article');

const Permission = require('../models/permission');
const Status = require('../models/status');

const middleware = require('../middleware');

//Function to display user inbox
router.get('/', middleware.isLoggedIn, middleware.isAdmin, (req, res) => {
	 res.render('admin/index');
})

// displays moderator page
router.get('/moderate', middleware.isLoggedIn, middleware.isMod, (req, res) => {
	Comment.find({status: 'flagged'})
	.populate({path: 'author', select:['username','imageUrl']})
	.populate({path: 'statusBy', select:['username', 'imageUrl']})
	.populate({path: 'room', select: ['name']})
	.exec((err, foundComments) => {
		if(err) {
			req.flash('error', 'Cannot access DataBase');
			res.redirect('/admin');

		} else {
		  res.render('admin/mod', {comments: foundComments});
		}
	});
});

// displays permissions page
router.get('/permissions', middleware.isLoggedIn, middleware.isAdmin, (req, res) => {
	User.find({authenticated: true}, (err, foundUsers) => {
		if(err || !foundUsers) {
			req.flash('error', 'Cannot access Database');
			res.redirect('/admin');

		} else {
		  res.render('admin/permission', {users: foundUsers});
		}
	});
});

// displays status page
router.get('/status', middleware.isLoggedIn, middleware.isMod, (req, res) => {
	User.find({authenticated: true}, (err, foundUsers) => {
		if(err || !foundUsers) {
			req.flash('error', 'Cannot access Database');
			res.redirect('/admin');
		} else {
			res.render('admin/status', {users: foundUsers, tags: ['Cashier', 'Tutor', 'Editor']});
		}
	});
});

router.get('/whitelist', middleware.isLoggedIn, middleware.isPrincipal, (req, res) => {
	(async() => {
		const emails = await Email.find({name: {$ne: req.user.email}});

		if (!emails) {
			req.flash('error', "Unable to find emails");
			return res.redirect('back');
		}

		const users = await User.find({authenticated: true});

		if (!users) {
			req.flash('error', "Unable to find users");
			return res.redirect('back');
		}

		res.render('admin/whitelist', {emails, users});

	})().catch(err => {
		req.flash('error', "Unable to access database");
		res.redirect('back');
	});
});

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
		req.flash('success', "Email added!");
		res.redirect('/admin/whitelist');


	})().catch(err => {
		req.flash('error', "Unable to access database");
		res.redirect('back');
	});
});

router.post('/add-permission', (req, res) => {
  Permission.create({title: req.body.permission}, (err, permission ) => {
    if (err || !permission) {
      req.flash('error', "Unable to create permission");
      res.redirect('back');

    } else {
      req.flash('success', "Permission created!");
      res.redirect('/admin/permissions');
    }
  });
});

router.post('/add-status', (req, res) => {
  Status.create({title: req.body.status, plural: req.body.plural, version: req.body.version}, (err, status) => {
    if (err || !status) {
      req.flash('error', "Unable to create status");
      res.redirect('back');

    } else {
      req.flash('success', "Status created!");
      res.redirect('/admin/status');
    }
  });
});

// router.delete('/whitelist/:id', middleware.isLoggedIn, middleware.isPrincipal, (req, res) => {
// 	(async() => {
// 		const email = await Email.findByIdAndDelete(req.params.id);
//
// 		if (!email) {
// 			req.flash('error', "Unable to remove email from database");
// 			return res.redirect('back');
// 		}
//
// 		const users = await User.find({authenticated: true, email: email.address});
//
// 		if (!users) {
// 			req.flash('error', "Unable to delete users with this email");
// 			return res.redirect('back');
// 		}
//
// 		const allUsers = await User.find({authenticated: true});
//
// 		let deletedComments = null;
//
// 		let messageSent = null;
// 		let deletedMessages = null;
//
// 		let messagesReceived = null;
// 		let messageUpdate;
//     let messageSender;
// 		let emptyMessages = null;
//
// 		let anns = null;
// 		let deletedAnns = null;
//
// 		let deletedArticles = null;
// 		let deletedRequests = null;
//
// 		let orders = null;
// 		let deletedOrder = null;
//
// 		let roomsCreated = null;
// 		let deletedRoomCreated = null;
//
// 		let roomsPartOf = null;
// 		let roomUpdates = null;
// 		let updatedRoom = null;
//
// 		let deletedProjectsPosted = null;
//
// 		let projectsCreated = null;
// 		let projectUpdates = null;
// 		let updatedProjects = null;
// 		let emptyProjects = null
//
// 		for (let user of users) {
// 			deletedComments = await Comment.deleteMany({author: user._id});
//
// 		if (!deletedComments) {
// 			req.flash('error', "Unable to delete your comments");
// 			return res.redirect('back');
// 		}
//
// 		deletedMessages = await Message.deleteMany({sender: user._id});
//
// 		if (!deletedMessages) {
// 		 req.flash('error', "Unable to delete your messages");
// 		 return res.redirect('back');
// 		}
//
// 		messagesReceived = await Message.find({});
//
// 		if (!messagesReceived) {
// 			req.flash('error', "Unable to find your messages");
// 			return res.redirect('back');
// 		}
//
// 		for (let message of messagesReceived) {
// 			if (message.recipients.includes(user._id)) {
// 				messageUpdate = await Message.findByIdAndUpdate(message._id, {$pull: {recipients: user._id, read: req.user._id}});
//
// 				if (!messageUpdate) {
// 					req.flash('error', "Unable to update your messages");
// 					return res.redirect('back');
// 				}
//
//         for (let i = message.replies.length; i > 0; i--) {
//           if (message.replies[i].sender.equals(user._id)) {
//             message.replies.splice(i, 1);
//           }
//         }
// 			}
// 		}
//
//     //Remove all messages which are now 'empty', but still have the original sender in the 'recipients' (meaning the person who is being deleted replied to this message)
//     for (let message of messagesReceived) {
//       if (message.recipients.length == 1 && message.recipients[0].equals(message.sender)) {
//
//         //Remove 1 from the original sender's read (if they haven't read this message yet)
//
//         if (!message.read.includes(message.sender)) {
//           messageSender = await User.findById(message.sender);
//
//           if (!messageSender) {
//             req.flash('error', "Unable to update your messages");
//             return res.redirect('back');
//           }
//
//           messageSender.msgCount -= 1;
//           messageSender.save();
//         }
//
//         messageUpdate = await Message.findByIdAndDelete(message._id);
//
//         if (!messageUpdate) {
//           req.flash('error', "Unable to update your messages");
//           return res.redirect('back');
//         }
//       }
//     }
//
// 		emptyMessages = await Message.deleteMany({recipients: []});
//
// 		if (!emptyMessages) {
// 			req.flash('error', "Unable to delete your messages");
// 			return res.redirect('back');
// 		}
//
// 		anns = await Announcement.find({sender: user._id});
//
// 		if (!anns) {
//       req.flash('error', "Unable to delete your announcements");
//       return res.redirect('back');
//     }
//
//     for (let ann of anns) {
//       for (let user of allUsers) {
//         for (let i = 0; i < user.annCount.length; i +=1) {
//           if (user.annCount[i].announcement.toString() == ann._id.toString()) {
//             user.annCount.splice(i, 1);
//           }
//         }
//         await user.save();
//       }
//     }
//
// 		deletedAnns = await Announcement.deleteMany({sender: user._id});
//
// 		if (!deletedAnns) {
// 			req.flash('error', "Unable to delete your announcements");
// 			return res.redirect('back');
// 		}
//
// 		deletedArticles = await Article.deleteMany({author: user._id});
//
// 		if (!deletedArticles) {
// 			req.flash('error', "Unable to delete your articles");
// 			return res.redirect('back');
// 		}
//
// 		deletedRequests = await Request.deleteMany({requester: user._id});
//
// 		if (!deletedRequests) {
// 			req.flash('error', "Unable to delete your requests");
// 			return res.redirect('back');
// 		}
//
// 		orders = await Order.find({customer: user._id});
//
//     if (!orders) {
//       req.flash('error', "Unable to find your orders");
//       return res.redirect('back');
//     }
//
//     for (let order of orders) {
//       deletedOrder = await Order.findByIdAndDelete(order._id).populate('items.item');
//       if (!deletedOrder) {
//         req.flash("error", "Unable to delete orders");
//         return res.redirect('back');
//       }
//
//       for (let i = 0; i < deletedOrder.items.length; i += 1) { //For each of the order's items, add the number ordered back to that item. (If there are 12 available quesadillas and our user ordered 3, there are now 15)
//
//         if (deletedOrder.present) {
//           deletedOrder.items[i].item.availableItems += deletedOrder.items[i].quantity;
//           deletedOrder.items[i].item.isAvailable = true;
//           await deletedOrder.items[i].item.save();
//         }
//       }
//     }
//
// 		roomsCreated = await Room.find({});
//
//     if (!roomsCreated) {
//       req.flash('error', "Unable to delete your rooms");
//       return res.redirect('back');
//     }
//
//     for (let room of roomsCreated) {
// 			if (room.creator.id.toString() == user._id.toString()) {
//       	deletedRoomCreated = await Room.findByIdAndDelete(room._id);
//
// 				if (!deletedRoomCreated) {
// 	        req.flash('error', "Unable to delete your rooms");
// 	        return res.redirect('back');
// 	      }
// 			}
//     }
//
// 		roomsPartOf = await Room.find({});
//
// 		if (!roomsPartOf) {
// 			req.flash('error', "Unable to find your rooms");
// 			return res.redirect('back');
// 		}
//
// 		roomUpdates = [];
//
// 		for (let room of roomsPartOf) {
// 			if (room.members.includes(user._id)) {
// 				roomUpdates.push(room._id);
// 			}
// 		}
//
// 		for (let room of roomUpdates) {
// 			updatedRoom = await Room.findByIdAndUpdate(room, {$pull: {members: user._id}});
//
// 			if (!updatedRoom) {
// 				req.flash('error', "Unable to access your rooms");
// 				return res.redirect('back');
// 			}
// 		}
//
// 		deletedProjectsPosted = await Project.deleteMany({poster: user._id});
//
// 		if (!deletedProjectsPosted) {
// 			req.flash('error', "Unable to remove you from your projects");
// 			return res.redirect('back');
// 		}
//
// 		projectsCreated = await Project.find({});
//
// 		if (!projectsCreated) {
// 			req.flash('error', "Unable to find your projects");
// 			return res.redirect('back');
// 		}
//
// 		projectUpdates = [];
//
// 		for (let project of projectsCreated) {
// 			if (project.creators.includes(user._id)) {
// 				projectUpdates.push(project._id);
// 			}
// 		}
//
// 		for (let project of projectUpdates) {
// 			updatedProject = await Project.findByIdAndUpdate(project, {$pull: {creators: user._id}});
//
// 			if (!updatedProject) {
// 				req.flash('error', "Unable to access your projects");
// 				return res.redirect('back');
// 			}
// 		}
// 	}
//
// 	let deletedUser;
//
// 	for (let user of users) {
// 		deletedUser = await User.findByIdAndDelete(user._id);
//
// 		if (!deletedUser) {
// 			req.flash('error', 'Unable to delete account');
// 			return res.redirect('back');
// 		}
//
//     transport(deletedUser, 'Profile Deletion Notice', `<p>Hello ${deletedUser.firstName},</p><p>You are receiving this email because your email has been removed from Saberchat's email whitelist. Your account and all of its data has been deleted. Please contact a faculty member if  you think there has been a mistake.</p>`);
// 	}
//
// 	req.flash('success', "Email Removed From Whitelist! Any users with this email have been removed.");
// 	res.redirect('/admin/whitelist');
//
// 	})().catch(err => {
// 		req.flash('error', "Unable to access database");
// 		res.redirect('back');
// 	});
// });

// changes permissions
router.put('/permissions', middleware.isLoggedIn, middleware.isAdmin, (req, res) => {

	User.findById(req.body.user, (err, user) => {
		if (err || !user) {
			res.json({error: "Error. Could not change"});

		} else if (req.body.role == 'admin' || req.body.role == "principal") { //Changing a user to administrator or principal requires specific permissions

			if(req.user.permission == 'principal') { // check if current user is the principal
				user.permission = req.body.role;
				user.save();
				res.json({success: "Succesfully changed", user});

			} else {
				res.json({error: "You do not have permissions to do that", user});
			}

		} else {
			if ((user.permission == "principal" || user.permission == "admin") && req.user.permission != "principal") {
				res.json({error: "You do not have permissions to do that", user});

			} else {
				user.permission = req.body.role;
				user.save();
				res.json({success: 'Succesfully changed', user});
			}
		}
	});
});

// changes status
router.put('/status', middleware.isLoggedIn, middleware.isMod, (req, res) => {
	(async() => {
		const user = await User.findById(req.body.user);

		if(!user) {
			return res.json({error: 'Error. Could not change'});
		}

		if (user.status == "faculty") {
			let teaching = false;

			const courses = await Course.find({});
			if (!courses) {
				return res.json({error: "Error. Could not change", user});
			}

			for (let course of courses) {
				if (course.teacher.equals(user._id)) {
					teaching = true;
					break;
				}
			}

			if (teaching) {
				return res.json({error: "User is an active teacher", user});
			}

			user.status = req.body.status;
			await user.save();
			return res.json({success: "Succesfully changed", user});
		}

		user.status = req.body.status;
		await user.save();
		return res.json({success: "Successfully Changed", user});

	})().catch(err => {
		res.json({error: "Error. Could not change"});
	});
});

router.put('/tag', middleware.isLoggedIn, middleware.isMod, (req, res) => {

  (async() => {
    const user = await User.findById(req.body.user);

    if(!user) {
      return res.json({error: 'Error. Could not change'});
    }

    if (user.tags.includes(req.body.tag)) {

      if (req.body.tag == "Tutor") {
        const courses = await Course.find({});

        if (!courses) {
          return res.json({error: 'Error. Could not change'});
        }

        let active = false;

        loop1:
        for (let course of courses) {
          loop2:
          for (let tutor of course.tutors) {
            if (tutor.tutor.equals(user._id)) {
              active = true;
              break loop1;
            }
          }
        }

        if (active) {
          return res.json({error: "User is an Active Tutor"});

        } else {
          user.tags.splice(user.tags.indexOf(req.body.tag), 1);
          user.save();
          return res.json({success: "Successfully removed status", tag: req.body.tag})
        }

      } else {
        user.tags.splice(user.tags.indexOf(req.body.tag), 1);
        user.save();
        return res.json({success: "Successfully removed status", tag: req.body.tag})
      }

    } else {
      user.tags.push(req.body.tag);
      user.save();
      return res.json({success: "Successfully added status", tag: req.body.tag})
    }

  })().catch(err => {
    res.json({error: 'Error. Could not change'});
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
});

module.exports = router;
