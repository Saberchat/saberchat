const User = require('../models/user');
const Email = require('../models/admin/email');

const Comment = require('../models/chat/comment');
const Room = require('../models/chat/room');
const Request = require('../models/inbox/accessRequest');

const Message = require('../models/inbox/message');
const Announcement = require('../models/announcements/announcement');
const Project = require('../models/projects/project');

const Order = require('../models/cafe/order');
const Article = require('../models/wHeights/article');
const Course = require('../models/homework/course');
const {sendGridEmail} = require("../services/sendGrid");
const convertToLink = require("../utils/convert-to-link");
const Filter = require('bad-words');
const filter = new Filter();
const axios = require('axios');
const dateFormat = require("dateformat");
const {cloudUpload, cloudDelete} = require('../services/cloudinary');
const {objectArrIncludes} = require('../utils/object-operations');

const controller = {};

if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

controller.index = async function(req, res) {
    const users = await User.find({authenticated: true});
    if (!users) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }

    for (let user of users) {
		console.log(`\n${user.firstName.toUpperCase()} ${user.lastName.toUpperCase()}'S SABERCHAT LOGIN ACTIVITY`);
		for (let login of user.logins) {
			console.log(`${dateFormat(login, "h:MM TT")} on ${dateFormat(login, "mmm d, yyyy")}`);
		}
	}

    return res.render("profile/index", {users});
}

controller.edit = function(req, res) {
    return res.render('profile/edit');
}

controller.changeLoginInfo = function(req, res) {
    return res.render('profile/edit_pwd_email');
}

controller.show = async function(req, res) {
    const user = await User.findById(req.params.id).populate('followers');
    if (!user) {
        req.flash('error', 'Error. Cannot find user.');
        return res.redirect('back');
    }

    let followerIds = [];
    let following = [];
    let currentUserFollowing = [];

    for (let follower of user.followers) {
        followerIds.push(follower._id);
    }

    const users = await User.find({authenticated: true});
    if (!users) {
        req.flash('error', 'Error. Cannot find users.');
        return res.redirect('back');
    }

    for (let u of users) {
        if (u.followers.includes(user._id)) {
            following.push(u);
        }

        if (u.followers.includes(req.user._id)) {
            currentUserFollowing.push(u);
        }
    }

    const convertedDescription = convertToLink(user.description);
    res.render('profile/show', {user, following, followerIds, convertedDescription});
}

controller.update = async function(req, res) {
    const overlap = await User.find({
        authenticated: true,
        username: filter.clean(req.body.username),
        _id: {$ne: req.user._id}
    });
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
        status: status.toLowerCase(),
        imageFile: {
            url: req.user.imageFile.url,
            filename: req.user.imageFile.filename,
            display: req.body.showProfileImage == "upload"
        },
        bannerFile: {
            url: req.user.bannerFile.url,
            filename: req.user.bannerFile.filename,
            display: req.body.showBannerImage == "upload"
        },
    };

    if (req.body.imageUrl) {
        user.imageUrl = {
            url: req.body.imageUrl,
            display: req.body.showProfileImage == "url"
        };
    }
    if (req.body.bannerUrl) {
        user.bannerUrl = {
            url: req.body.bannerUrl,
            display: req.body.showBannerImage == "url"
        };
    }

    if (req.files) {
        let cloudErr;
        let cloudResult;
        if (req.files.imageFile) {
            if (req.user.imageFile.filename) {
                [cloudErr, cloudResult] = await cloudDelete(req.user.imageFile.filename, "image");
                if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                    req.flash('error', 'Error deleting uploaded image');
                    return res.redirect('back');
                }
            }
            [cloudErr, cloudResult] = await cloudUpload(req.files.imageFile[0], "image");
            if (cloudErr || !cloudResult) {
                req.flash('error', 'Upload failed');
                return res.redirect('back');
            }
            user.imageFile = {
                filename: cloudResult.public_id,
                url: cloudResult.secure_url,
                originalName: req.files.imageFile[0].originalname,
                display: req.body.showProfileImage == "upload"
            };
        }

        if (req.files.imageFile2) {
            if (req.user.bannerFile.filename) {
                [cloudErr, cloudResult] = await cloudDelete(req.user.bannerFile.filename, "image");
                if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                    req.flash('error', 'Error deleting uploaded image 1');
                    return res.redirect('back');
                }
            }

            [cloudErr, cloudResult] = await cloudUpload(req.files.imageFile2[0], "image");
            if (cloudErr || !cloudResult) {
                req.flash('error', 'Upload failed');
                return res.redirect('back');
            }
            user.bannerFile = {
                filename: cloudResult.public_id,
                url: cloudResult.secure_url,
                originalName: req.files.imageFile2[0].originalname,
                display: req.body.showBannerImage == "upload"
            };
        }
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, user); //find and update the user with new info
    if (!updatedUser) {
        req.flash('error', 'There was an error updating your profile');
        return res.redirect('back');
    }

    req.flash('success', 'Updated your profile');
    return res.redirect(`/profiles/${req.user._id}`);
}

controller.tagPut = async function(req, res) {
    if (req.user.tags.includes(req.body.tag)) {
      if (req.body.tag == "Tutor") {
        const courses = await Course.find({});
        if (!courses) {
            return res.json({error: 'Error. Could not change'});
        }

        for (let course of courses) {
            if (objectArrIncludes(course.tutors, "tutor", req.user._id) > -1) {
                return res.json({error: "You are an active tutor"});
            }
        }
      }
      
      req.user.tags.splice(req.user.tags.indexOf(req.body.tag), 1);
      await req.user.save();
      return res.json({success: "Succesfully removed status", tag: req.body.tag, user: req.user._id});

    } else {
        req.user.tags.push(req.body.tag);
        await req.user.save();
        return res.json({success: "Succesfully added status", tag: req.body.tag, user: req.user._id});
    }
}

controller.changeEmailPut = async function(req, res) {
    if (req.body.receiving_emails) {
        req.user.receiving_emails = true;

    } else {
        req.user.receiving_emails = false;
    }

    await req.user.save();

    if (req.user.email == req.body.email) {
        req.flash('success', "Email sending settings updated");
        return res.redirect(`/profiles/${req.user._id}`);
    }

    const emails = await Email.find({address: req.body.email, version: "accesslist"});
    if (!emails) {
        req.flash('error', "Unable to find emails");
        return res.redirect('back');
    }

    if (emails.length == 0 && req.body.email.split("@")[1] != "alsionschool.org") {
        req.flash('error', "New email must be an Alsion-verified email");
        return res.redirect('back');
    }

    const overlap = await User.find({authenticated: true, email: req.body.email, _id: {$ne: req.user._id}});
    if (!overlap) {
        req.flash('error', "Unable to find users");
        return res.redirect('back');

    } else if (overlap.length > 0) {
        req.flash('error', "Another user already has that email.");
        return res.redirect('back');
    }

    const url = process.env.SENDGRID_BASE_URL + '/mail/send';
    const data = {
        "personalizations": [
            {
                "to": [
                    {
                        "email": req.body.email
                    }
                ],
                "subject": 'Email Update Confirmation'
            }
        ],
        "from": {
            "email": "noreply.saberchat@gmail.com",
            "name": "SaberChat"
        },
        "content": [
            {
                "type": "text/html",
                "value": `<p>Hello ${req.user.firstName},</p><p>You are receiving this email because you recently requested to change your Saberchat email to ${req.body.email}.</p><p>Click <a href="https://alsion-saberchat.herokuapp.com/profiles/confirm-email/${req.user._id}?token=${req.user.authenticationToken}&email=${req.body.email}">this link</a> to confirm your new email address.`
            }
        ]
    }

    axios({
        method: 'post',
        url: url,
        data: data,
        headers: {
            "Authorization": "Bearer " + process.env.SENDGRID_KEY
        }
    }).then(response => {
        console.log(`Email Sent with status code: ${response.status}`);
    }).catch(error => {
        console.log(error);
    });

    req.flash('success', 'Go to your new email to confirm new address');
    return res.redirect('/profiles/change-login-info');
}

controller.confirmEmail = async function(req, res) {
    const user = await User.findById(req.params.id);
    if (!user) {
        req.flash('error', "Unable to find user");
        return res.redirect('back');
    }

    //Update authentication token
    let charSetMatrix = [];

    charSetMatrix.push('qwertyuiopasdfghjklzxcvbnm'.split(''));
    charSetMatrix.push('QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
    charSetMatrix.push('1234567890'.split(''));
    charSetMatrix.push('()%!~$#*[){]|,.<>');

    let tokenLength = Math.round((Math.random() * 15)) + 15;
    let token = "";

    let charSet; //Which character set to choose from

    for (let i = 0; i < tokenLength; i += 1) {
        charSet = charSetMatrix[Math.floor(Math.random() * 4)];
        token += charSet[Math.floor((Math.random() * charSet.length))];
    }

    if (req.query.token.toString() == user.authenticationToken) {
        user.email = req.query.email;
        user.authenticationToken = token;
        await user.save();

        await sendGridEmail(user, 'Email Update Confirmation', `<p>Hello ${user.firstName},</p><p>You are receiving this email because you recently made changes to your Saberchat email. This is a confirmation of your profile.</p><p>Your username is ${user.username}.</p><p>Your full name is ${user.firstName} ${user.lastName}.</p><p>Your email is ${user.email}.</p>`, false);
        req.flash('success', "Email updated!")
        return res.redirect('/');
    }
    req.flash('error', "Invalid authentication token");
    return res.redirect('/');
}

controller.changePasswordPut = async function(req, res) {
    if (req.body.newPassword == req.body.newPasswordConfirm) {
        const user = await User.findById(req.user._id);
        if (!user) {
            req.flash('error', 'Error, cannot find user');
            return res.redirect('/');
        }

        await user.changePassword(req.body.oldPassword, req.body.newPassword);
        await sendGridEmail(req.user.email, 'Password Update Confirmation', `<p>Hello ${req.user.firstName},</p><p>You are receiving this email because you recently made changes to your Saberchat password. This is a confirmation of your profile.\n\nYour username is ${req.user.username}.\nYour full name is ${req.user.firstName} ${req.user.lastName}.\nYour email is ${req.user.email}\n\nIf you did not recently change your password, reset it immediately and contact a faculty member.</p>`, false);
        req.flash('success', 'Successfully changed your password');
        return res.redirect('/profiles/' + req.user._id);
    }

    req.flash('error', "Passwords do not match");
    return res.redirect('back');
}

controller.follow = async function(req, res) {
    const user = await User.findById(req.params.id);
    if (!user) {
        return res.json({error: "Error finding user"});
    }

    if (user.followers.includes(req.user._id)) {
        return res.json({error: "You are already following this user"});
    }

    if (user._id.equals(req.user._id)) {
        return res.json({error: "You may not follow yourself"});
    }


    user.followers.push(req.user);
    await user.save();
    return res.json({success: "Succesfully followed user", user: req.user});
}

controller.unfollow = async function(req, res) {
    const user = await User.findById(req.params.id);
    if (!user) {
        return res.json({error: "Error finding user"});
    }

    for (let i = 0; i < user.followers.length; i++) {
        if (user.followers[i].equals(req.user._id)) {
            user.followers.splice(i, 1);
            await user.save();
            return res.json({success: "Unfollowed user", user: req.user});
        }
    }
    return res.json({error: "You are not following this user"});
}

controller.remove = async function(req, res) {
    const user = await User.findById(req.params.id);
    if (!user) {
        return res.json({error: "Error finding user"});
    }

    if (req.user.followers.includes(user._id)) {
        req.user.followers.splice(req.user.followers.indexOf(user._id), 1);
        req.user.save();
        res.json({success: "Succesfully removed user"});
    }

    return res.json({error: "User is not following you"});
}

controller.deleteAccount = async function(req, res)  {
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
    let messageSender;

    for (let message of messagesReceived) {
      if (message.recipients.includes(req.user._id)) {
        messageUpdate = await Message.findByIdAndUpdate(message._id, {$pull: {recipients: req.user._id, read: req.user._id}});

        if (!messageUpdate) {
          req.flash('error', "Unable to update your messages");
          return res.redirect('back');
        }

        for (let i = message.replies.length-1; i > 0; i--) {
          if (message.replies[i].sender.equals(user._id)) {
            message.replies.splice(i, 1);
          }
        }
      }

    //Remove all messages which are now 'empty', but still have the original sender in the 'recipients' (meaning the person who is being deleted replied to this message)
      if (message.recipients.length == 1 && message.recipients[0].equals(message.sender)) {


        if (!message.read.includes(message.sender)) {
          messageSender = await User.findById(message.sender);

          if (!messageSender) {
            req.flash('error', "Unable to update your messages");
            return res.redirect('back');
          }

          messageSender.msgCount -= 1;
          await messageSender.save();
        }

        messageUpdate = await Message.findByIdAndDelete(message._id);
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

    const users = await User.find({authenticated: true});

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
      if (room.creator.toString() == req.user._id.toString()) {
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

    await sendGridEmail(deletedUser.email, 'Profile Deletion Confirmation', `<p>Hello ${deletedUser.firstName},</p><p>You are receiving this email because you recently deleted your Saberchat account. If you did not delete your account, contact a staff member immediately.</p>`, false);

    req.flash('success', "Account deleted!");
    return res.redirect('/');
}

module.exports = controller;