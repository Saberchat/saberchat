const express = require('express')
const router = express.Router();
const {multipleUpload} = require('../middleware/multer');
const {validateUserUpdate, validateEmailUpdate, validatePasswordUpdate} = require('../middleware/validation');
const middleware = require('../middleware');
const profile = require("../controllers/profile");
const wrapAsync = require("../utils/wrapAsync");

router.route('/')
    .get(middleware.isLoggedIn, wrapAsync(profile.index)) // renders the list of users page
    .put(middleware.isLoggedIn, multipleUpload, validateUserUpdate, wrapAsync(profile.update));

router.get('/edit', middleware.isLoggedIn, profile.edit); //renders profiles edit page
router.get('/change-login-info', middleware.isLoggedIn, profile.changeLoginInfo); //renders the email/password edit page
router.get('/confirm-email/:id', wrapAsync(profile.confirmEmail));
router.get('/:id', middleware.isLoggedIn, wrapAsync(profile.show));

router.put('/profile', middleware.isLoggedIn, multipleUpload, validateUserUpdate, wrapAsync(profile.profilePut)); // update user route.
router.put('/tag', middleware.isAdmin, profile.tagPut);
router.put('/change-email', middleware.isLoggedIn, validateEmailUpdate, wrapAsync(profile.changeEmailPut)); //route for changing email
router.put('/change-password', middleware.isLoggedIn, validatePasswordUpdate, wrapAsync(profile.changePasswordPut)); //route for changing password
router.put('/follow/:id', wrapAsync(profile.follow));
router.put('/unfollow/:id', wrapAsync(profile.unfollow));
router.put('/remove/:id', wrapAsync(profile.remove));

module.exports = router;

//EVERYTHING BELOW IS COMMENTED OUT AND IS FOR CHANGES WE MIGHT DO LATER

// const axios = require('axios');
//
// if (process.env.NODE_ENV !== "production") {
//     require('dotenv').config();
// }
//
// const User = require('../models/user');
// const Email = require('../models/admin/email');
//
// const Comment = require('../models/chat/comment');
// const Room = require('../models/chat/room');
// const Request = require('../models/inbox/accessRequest');
//
// const Message = require('../models/inbox/message');
// const Announcement = require('../models/announcements/announcement');
// const Project = require('../models/projects/project');
//
// const Order = require('../models/cafe/order');
// const Article = require('../models/wHeights/article');

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
//     const messagesSent = await Message.find({sender: req.user._id}).populate('read');
//
//     if (!messagesSent) {
//       req.flash('error', "Unable to delete your messages");
//       return res.redirect('back');
//     }
//
//     for (let message of messagesSent) {
//       for (let user of message.read) {
//         user.msgCount -= 1;
//         await user.save();
//       }
//     }
//
//     const deletedMessagesSent = await Message.deleteMany({sender: req.user._id});
//
//     if (!deletedMessagesSent) {
//       req.flash('error', "Unable to delete your messages");
//       return res.redirect('back');
//     }
//
//     const messagesReceived = await Message.find({});
//
//     if (!messagesReceived) {
//       req.flash('error', "Unable to delete your messages");
//       return res.redirect('back');
//     }
//
//     let messageUpdate;
//     let messageSender;
//
//     for (let message of messagesReceived) {
//       if (message.recipients.includes(req.user._id)) {
//         messageUpdate = await Message.findByIdAndUpdate(message._id, {$pull: {recipients: req.user._id, read: req.user._id}});
//
//         if (!messageUpdate) {
//           req.flash('error', "Unable to update your messages");
//           return res.redirect('back');
//         }
//
//         for (let i = message.replies.length-1; i > 0; i--) {
//           if (message.replies[i].sender.equals(user._id)) {
//             message.replies.splice(i, 1);
//           }
//         }
//       }
//
//     //Remove all messages which are now 'empty', but still have the original sender in the 'recipients' (meaning the person who is being deleted replied to this message)
//       if (message.recipients.length == 1 && message.recipients[0].equals(message.sender)) {
//
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
//           await messageSender.save();
//         }
//
//         messageUpdate = await Message.findByIdAndDelete(message._id);
//         if (!messageUpdate) {
//           req.flash('error', "Unable to update your messages");
//           return res.redirect('back');
//         }
//       }
//     }
//
//     const emptyMessages = await Message.deleteMany({recipients: []});
//
//     if (!emptyMessages) {
//       req.flash('error', "Unable to delete your messages");
//       return res.redirect('back');
//     }
//
//     const anns = await Announcement.find({sender: req.user._id});
//
//     if (!anns) {
//       req.flash('error', "Unable to delete your announcements");
//       return res.redirect('back');
//     }
//
//     const users = await User.find({authenticated: true});
//
//     for (let ann of anns) {
//       for (let user of users) {
//         for (let i = 0; i < user.annCount.length; i +=1) {
//           if (user.annCount[i].announcement.toString() == ann._id.toString()) {
//             user.annCount.splice(i, 1);
//           }
//         }
//         await user.save();
//       }
//     }
//
//     const deletedAnns = await Announcement.deleteMany({sender: req.user._id});
//
//     if (!deletedAnns) {
//       req.flash('error', "Unable to delete your announcements");
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
//     const orders = await Order.find({customer: req.user._id});
//
//     if (!orders) {
//       req.flash('error', "Unable to find your orders");
//       return res.redirect('back');
//     }
//
//     let deletedOrder;
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
//     const roomsCreated = await Room.find({});
//
//     if (!roomsCreated) {
//       req.flash('error', "Unable to delete your rooms");
//       return res.redirect('back');
//     }
//
//     let deletedRoomCreated = null;
//
//     for (let room of roomsCreated) {
//       if (room.creator.id.toString() == req.user._id.toString()) {
//         deletedRoomCreated = await Room.findByIdAndDelete(room._id);
//
//         if (!deletedRoomCreated) {
//           req.flash('error', "Unable to delete your rooms");
//           return res.redirect('back');
//         }
//       }
//     }
//
//     const roomsPartOf = await Room.find({});
//
//     if (!roomsPartOf) {
// 			req.flash('error', "Unable to find your rooms");
// 			return res.redirect('back');
// 		}
//
// 		let roomUpdates = [];
//
// 		for (let room of roomsPartOf) {
// 			if (room.members.includes(req.user._id)) {
// 				roomUpdates.push(room._id);
// 			}
// 		}
//
// 		for (let room of roomUpdates) {
// 			updatedRoom = await Room.findByIdAndUpdate(room, {$pull: {members: req.user._id}});
//
// 			if (!updatedRoom) {
// 				req.flash('error', "Unable to access your rooms");
// 				return res.redirect('back');
// 			}
// 		}
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
//     let projectUpdates = [];
//
//     for (let project of projectsCreated) {
//       if (project.creators.includes(req.user._id)) {
//         projectUpdates.push(project._id);
//       }
//     }
//
//     let updatedProjectCreated;
//
//     for (let project of projectUpdates) {
//       updatedProjectCreated = await Project.findByIdAndUpdate(project, {$pull: {creators: user._id}});
//
//       if (!updatedProjectCreated) {
//         req.flash('error', "Unable to remove you from your projects");
//         return res.redirect('back');
//       }
//     }
//
//     const emptyProjects = await Project.deleteMany({creators: []});
//
//     if (!emptyProjects) {
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
//     await sendGridEmail(deletedUser.email, 'Profile Deletion Confirmation', `<p>Hello ${deletedUser.firstName},</p><p>You are receiving this email because you recently deleted your Saberchat account. If you did not delete your account, contact a staff member immediately.</p>`, false);
//
//     req.flash('success', "Account deleted!");
//     res.redirect('/');
//
//   })().catch(err => {
//     req.flash('error', "An Error Occurred");
//     res.redirect('back');
//   });
// });
