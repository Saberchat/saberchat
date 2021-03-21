//LIBRARIES
const {sendGridEmail} = require("../services/sendGrid");
const {objectArrIndex, concatMatrix, removeIfIncluded} = require("../utils/object-operations");
const setup = require("../utils/setup");

//SCHEMA
const Platform = require("../models/platform");
const {ChatMessage, AccessRequest, InboxMessage} = require('../models/notification');
const User = require("../models/user");
const Email = require("../models/admin/email");
const {Announcement, Project, Article} = require("../models/post");
const {Course, ChatRoom} = require('../models/group');
const Order = require('../models/cafe/order');

const controller = {};

controller.updatePlatformForm = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }
    return res.render("admin/settings", {platform, objectArrIndex});
}

controller.updatePlatform = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }
    const oldAddress = platform.emailExtension;
    for (let attr of ["name", "imageUrl", "emailExtension", "displayImages"]) { //Update elements with directly corresponding text
        platform[attr] = req.body[attr];
    }

    for (let attr of ["community", "services"]) { //Update elements which are textareas with split text
        platform[attr] = [];
        for (let element of req.body[attr].split('\n')) {
            if (element.split('\r').join('').split(' ').join('') != "") {
                platform[attr].push(element);
            }
        }
    }

    platform.info = [];
    let parsedText = [];
    for (let i = 0; i < req.body.infoHeading.length; i++) { //Update about information
        parsedText = [];
        for (let element of req.body.infoText[i].split('\n')) {
            if (element.split('\r').join('').split(' ').join('') != "") {
                parsedText.push(element);
            }
        }
        platform.info.push({
            heading: req.body.infoHeading[i],
            text: parsedText,
            image: req.body.infoImages[i]
        });
    }

    platform.updateTime = `${req.body.day} ${req.body.month}`;
    platform.contact = {heading: req.body.contactHeading, description: req.body.contactInfo};

    if (req.body.displayProjects) {
        if (objectArrIndex(platform.publicFeatures, "name", "Student Projects") == -1) {
            platform.publicFeatures.push({route: "projects", name: "Student Projects", icon: "paint-brush", subroutes: ["/"]});
        }
    } else {
        platform.publicFeatures.splice(objectArrIndex(platform.publicFeatures, "name", "Student Projects"), 1);
    }
    
    if (req.body.displayAnns) {
        if (objectArrIndex(platform.publicFeatures, "name", "Announcements") == -1) {
            platform.publicFeatures.push({route: "announcements", name: "Announcements", icon: "bullhorn", subroutes: ["/"]});
        }
    } else {
        platform.publicFeatures.splice(objectArrIndex(platform.publicFeatures, "name", "Announcements"), 1);
    }

    for (let i = 0; i < platform.features.length; i++) {
        platform.features[i].name = req.body.feature[i];
        platform.features[i].icon = req.body.icon[i];
    }

    if (oldAddress != req.body.emailExtension) { //Update all users who were by default allowed earlier
        let email;
        const users = await User.find({});
        for (let user of users) {
            if (user.email.split('@')[1] == oldAddress) {
                email = await Email.create({address: user.email, version: "accesslist"});
                if (!email) {
                    req.flash("error", "Unable to create new email");
                    return res.redirect("back");
                }
            }
        }

        const emails = await Email.find({version: "accesslist"});
        for (let email of emails) {
            if (email.address.split('@')[1] == req.body.emailExtension) { //Remove now-unnecessary emails from access list
                email = await Email.findByIdAndDelete(email._id);
                if (!email) {
                    req.flash("error", "Unable to delete email");
                    return res.redirect("back");
                }
            }
        }
    }

    await platform.save();
    req.flash("success", "Updated platform settings!");
    return res.redirect("/admin/settings");
}

controller.moderateGet = async function(req, res) { //Show all reported comments
    const platform = await setup(Platform);
    const comments = await ChatMessage.find({status: 'flagged'}).populate("author statusBy room");
    if (!platform || !comments) {
        req.flash('error', 'An Error Occurred');
        return res.redirect('/admin');
    }
    return res.render('admin/mod', {platform, comments});
}

controller.getContext = async function(req, res) { //Get context for reported comment
    const reportedComment = await ChatMessage.findById(req.body.commentId).populate("author");
    if (!reportedComment) {
        return res.json({error: "Unable to find comment"});
    }

    const allComments = await ChatMessage.find({room: reportedChatMessage.room}).populate("author"); //All comments from the reported comment's room
    if (!allComments) {
        return res.json({error: "Unable to find other comments"});
    }

    const commentIndex = objectArrIndex(allComments, "_id", reportedChatMessage._id); //Get index of reported comment
    let context = []; //Comments 5 before and 5 after

    //Find the comments 5 before and 5 after the reported one, and add to array
    for (let i = -5; i >= 5; i++) {
        if (commentIndex + i > 0) {
            if (allComments[commentIndex + i].author) {
                context.push(allComments[commentIndex + i]);
            }
        }
    }
    return res.json({success: "Succesfully collected data", context});
}

controller.ignoreComment = async function(req, res) { //Ignore comment
    const comment = await ChatMessage.findById(req.body.commentId).populate('statusBy');
    if (!comment) { return res.json({error: 'Could not find comment'});}

    //Users cannot handle comments that they have written/reported
    if (comment.author.equals(req.user._id) || comment.statusBy._id.equals(req.user._id)) {
        return res.json({error: "You cannot handle comments that you have written or reported"});
    }

    comment.status = "ignored";
    await comment.save();
    comment.statusBy.falseReportCount += 1; //Mark that the person who reported comment has reported an inoffensive comment
    await comment.statusBy.save();
    return res.json({success: 'Ignored comment'});
}

controller.deleteComment = async function(req, res) {
    const comment = await ChatMessage.findById(req.body.commentId).populate("author");
    if (!comment) {
        return res.json({error: 'Could not find comment'});
    }

    //Users cannot handle comments that they have written/reported
    if (comment.author.equals(req.user._id) || comment.statusBy._id.equals(req.user._id)) {
        return res.json({error: "You cannot handle comments that you have written or reported"});
    }

    comment.status = "deleted";
    await comment.save();
    comment.author.reportedCount += 1; //Mark that the person who wrote the comment has written an offensive comment
    await comment.author.save();
    return res.json({success: 'Deleted comment'});
}

controller.permissionsGet = async function(req, res) { //Show page with all users and their permissions
    const platform = await setup(Platform);
    const users = await User.find({authenticated: true});
    if (!platform || !users) {
        req.flash('error', 'An Error Occurred');
        return res.redirect('/admin');
    }
    
    return res.render('admin/permission', {
        platform,
        users,
        statusMatrix: concatMatrix([
            platform.statusesProperty,
            platform.statusesPlural
        ]),
        permMatrix: concatMatrix([
            platform.permissionsProperty,
            platform.permissionsDisplay
        ]).reverse()
    });
}

controller.statusGet = async function(req, res) { //Show page with all users and their statuses
    const platform = await setup(Platform);
    const users = await User.find({authenticated: true});
    if (!platform || !users) {
        req.flash('error', 'An Error Occurred');
        return res.redirect('/admin');
    }

    return res.render('admin/status', {
        platform,
        users,
        tags: platform.tags, //List of tags that can be added/removed to tutors
        statusMatrix: concatMatrix([
            platform.statusesProperty,
            platform.statusesSingular
        ]).reverse(),
        permMatrix: concatMatrix([
			platform.permissionsProperty,
			platform.permissionsDisplay
		]).reverse()
    });
}

controller.permissionsPut = async function (req, res) { //Update a user's permissions
    const platform = await setup(Platform);
    const user = await User.findById(req.body.userId);
    if (!platform || !user) {
        return res.json({error: "Error. Could not change"});
    }

    if (platform.permissionsProperty.slice[platform.permissionsProperty.length-2].includes(req.body.role)) { //Changing a user to higher level permissions requires specific permissions
        if (req.user.permission == platform.permissionsProperty[platform.permissionsProperty.length-1]) { // check if current user is the highest permission
            user.permission = req.body.role;
            await user.save();
            return res.json({success: "Succesfully changed", user});

        } else {
            return res.json({error: "You do not have permissions to do that", user});
        }
    }

    if ((user.permission == platform.permissionsProperty[platform.permissionsProperty.length-1] || user.permission == platform.permissionsProperty[platform.permissionsProperty.length-2]) && req.user.permission != platform.permissionsProperty[platform.permissionsProperty.length-1]) { //More permission restructions
        return res.json({error: "You do not have permissions to do that", user});
    }

    user.permission = req.body.role; //Update user's permission
    await user.save();
    return res.json({success: 'Succesfully changed', user});
}

controller.statusPut = async function(req, res) { //Update user's status
    const platform = await setup(Platform);
    const user = await User.findById(req.body.userId);
    if (!platform || !user) {
        return res.json({error: 'Error. Could not change'});
    }

    if (user.status == platform.teacherStatus) { //If user is currently teaching a course, they cannot lose their teacher status
        const courses = await Course.find({});
        if (!courses) {
            return res.json({error: "Error. Could not change", user});
        }

        for (let course of courses) {
            if (course.creator.equals(user._id)) {
                return res.json({error: "User is an active teacher", user});
            }
        }

        user.status = req.body.status; //If no errors, update user's status
        await user.save();
        return res.json({success: "Succesfully changed", user});
    }
    user.status = req.body.status;
    await user.save();
    return res.json({success: "Successfully Changed", user});
}

controller.accesslistGet = async function(req, res) { //Show page with all permitted emails
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

    let emails;
    if (req.query.version) { //If user wants a specific email list
        if (["accesslist", "blockedlist"].includes(req.query.version)) {
            emails = await Email.find({address: {$ne: req.user.email}, version: req.query.version});
        } else { //If list is not access list or blocked list, use the access list
            emails = await Email.find({address: {$ne: req.user.email}, version: "accesslist"});
        }
    } else { //If list is not specified, use the access list
        emails = await Email.find({address: {$ne: req.user.email}, version: "accesslist"});
    }

    if (!emails) {
        req.flash('error', "Unable to find emails");
        return res.redirect('back');
    }

    const users = await User.find({authenticated: true});
    if (!users) {
        req.flash('error', "Unable to find users");
        return res.redirect('back');
    }

    if (req.query.version) { //Display list based on specified version
        if (["accesslist", "blockedlist"].includes(req.query.version)) {
            return res.render('admin/accesslist', {platform, emails, users, version: req.query.version});
        }
    }
    return res.render('admin/accesslist', {platform, emails, users, version: "accesslist"});
}

controller.addEmail = async function (req, res) { //Add email to access list/blocked list
    const platform = await setup(Platform);
    if (!platform) {
        return res.json({error: "Unable to find platform"});
    }

    if (req.body.version === "accesslist") {
        if (platform.emailExtension != '' && req.body.address.split('@')[1] === platform.emailExtension) { //These emails are already verified
            return res.json({error: `${platform.name} emails do not need to be added to the Access List`});
        }
    }

    const overlap = await Email.findOne({address: req.body.address});
    if (overlap) { //If any emails overlap, don't create the new email
        return res.json({error: "Email is already either in Access List or Blocked List"});
    }

    if (req.body.version == "blockedlist") {
        const user = await User.findOne({email: req.body.address});
        if (user) {
            return res.json({error: "A user with that email already exists"});
        }
    }

    const email = await Email.create({address: req.body.address, version: req.body.version});
    if (!email) {
        return res.json({error: "Error creating email"});
    }
    return res.json({success: "Email added", email});
}

controller.deleteEmail = async function (req, res) { //Remove email from access list/blocked list
    const email = await Email.findById(req.body.email);
    if (!email) {
        return res.json({error: "Unable to find email"});
    }

    const users = await User.find({authenticated: true, email: email.address}); //Find users with this email
    if (!users) {
        return res.json({error: "Unable to find users"});
    }

    if (users.length === 0) { //If nobody currently has this email, remove it
        const deletedEmail = await Email.findByIdAndDelete(email._id);
        if (!deletedEmail) {
            return res.json({error: "Unable to delete email"});
        }
        return res.json({success: "Deleted email"});
    }
    return res.json({error: "Active user has this email"}); //If someone has this email, don't remove it
}

controller.tag = async function(req, res) { //Add/remove status tag to user
    const user = await User.findById(req.body.userId);
    if (!user) {
        return res.json({error: 'Error. Could not change'});
    }
    if (user.tags.includes(req.body.tag)) { //If user already has this tag (in which case, remove it)
        if (req.body.tag == "Tutor") { //
            const courses = await Course.find({});
            if (!courses) {
                return res.json({error: 'Error. Could not change'});
            }

            for (let course of courses) { //Iterate through courses and see if user is a tutor in any of them
                if (objectArrIndex(course.tutors, "tutor", user._id) > -1) {
                    return res.json({error: "User is an Active Tutor"});
                }
            }

            //If there is no error, remove the tag
            removeIfIncluded(user.tags, req.body.tag);
            await user.save();
            return res.json({success: "Successfully removed status", tag: req.body.tag})
        }

        //Remove the tag
        removeIfIncluded(user.tags, req.body.tag);
        await user.save();
        return res.json({success: "Successfully removed status", tag: req.body.tag})
    }

    //If user does not already have this tag, add it
    user.tags.push(req.body.tag);
    await user.save();
    return res.json({success: "Successfully added status", tag: req.body.tag})
}

controller.permanentDelete = async function(req, res) {
    const email = await Email.findByIdAndDelete(req.params.id);

    if (!email) {
        req.flash('error', "Unable to remove email from database");
        return res.redirect('back');
    }

    const users = await User.find({authenticated: true, email: email.address});

    if (!users) {
        req.flash('error', "Unable to delete users with this email");
        return res.redirect('back');
    }

    const allUsers = await User.find({authenticated: true});

    let deletedComments = null;

    let messageSent = null;
    let deletedMessages = null;

    let messagesReceived = null;
    let messageUpdate;
    let messageSender;
    let emptyMessages = null;

    let anns = null;
    let deletedAnns = null;

    let deletedArticles = null;
    let deletedRequests = null;

    let orders = null;
    let deletedOrder = null;

    let roomsCreated = null;
    let deletedRoomCreated = null;

    let roomsPartOf = null;
    let roomUpdates = null;
    let updatedRoom = null;

    let deletedProjectsPosted = null;

    let projectsCreated = null;
    let projectUpdates = null;
    let updatedProjects = null;
    let emptyProjects = null

    for (let user of users) {
        deletedComments = await ChatMessage.deleteMany({author: user._id});

    if (!deletedComments) {
        req.flash('error', "Unable to delete your comments");
        return res.redirect('back');
    }

    deletedMessages = await InboxMessage.deleteMany({author: user._id});

    if (!deletedMessages) {
        req.flash('error', "Unable to delete your messages");
        return res.redirect('back');
    }

    messagesReceived = await InboxMessage.find({});
    if (!messagesReceived) {
        req.flash('error', "Unable to find your messages");
        return res.redirect('back');
    }

    for (let message of messagesReceived) {
        if (message.recipients.includes(user._id)) {
            messageUpdate = await InboxMessage.findByIdAndUpdate(message._id, {$pull: {recipients: user._id, read: req.user._id}});

            if (!messageUpdate) {
                req.flash('error', "Unable to update your messages");
                return res.redirect('back');
            }

    for (let i = message.replies.length; i > 0; i--) {
        if (message.replies[i].author.equals(user._id)) {
            message.replies.splice(i, 1);
        }
    }
        }
    }

    //Remove all messages which are now 'empty', but still have the original author in the 'recipients' (meaning the person who is being deleted replied to this message)
    for (let message of messagesReceived) {
      if (message.recipients.length == 1 && message.recipients[0].equals(message.author)) {

        //Remove 1 from the original author's read (if they haven't read this message yet)
        if (!message.read.includes(message.author)) {
          messageSender = await User.findById(message.author);

          if (!messageSender) {
            req.flash('error', "Unable to update your messages");
            return res.redirect('back');
          }

          await messageSender.save();
        }

        messageUpdate = await InboxMessage.findByIdAndDelete(message._id);

        if (!messageUpdate) {
          req.flash('error', "Unable to update your messages");
          return res.redirect('back');
        }
      }
    }

    emptyMessages = await InboxMessage.deleteMany({recipients: []});
    if (!emptyMessages) {
        req.flash('error', "Unable to delete your messages");
        return res.redirect('back');
    }

    anns = await Announcement.find({author: user._id});
    if (!anns) {
        req.flash('error', "Unable to delete your announcements");
        return res.redirect('back');
    }

    for (let ann of anns) {
      for (let user of allUsers) {
        for (let i = 0; i < user.annCount.length; i +=1) {
          if (user.annCount[i].announcement.toString() == ann._id.toString()) {
            user.annCount.splice(i, 1);
          }
        }
        await user.save();
      }
    }

    deletedAnns = await Announcement.deleteMany({author: user._id});
    if (!deletedAnns) {
        req.flash('error', "Unable to delete your announcements");
        return res.redirect('back');
    }

    deletedArticles = await Article.deleteMany({author: user._id});
    if (!deletedArticles) {
        req.flash('error', "Unable to delete your articles");
        return res.redirect('back');
    }

    deletedRequests = await AccessRequest.deleteMany({author: user._id});
    if (!deletedRequests) {
        req.flash('error', "Unable to delete your requests");
        return res.redirect('back');
    }

    orders = await Order.find({customer: user._id});
    if (!orders) {
      req.flash('error', "Unable to find your orders");
      return res.redirect('back');
    }

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

    roomsCreated = await ChatRoom.find({});
    if (!roomsCreated) {
      req.flash('error', "Unable to delete your rooms");
      return res.redirect('back');
    }

    for (let room of roomsCreated) {
        if (room.creator.toString() == user._id.toString()) {
      	deletedRoomCreated = await ChatRoom.findByIdAndDelete(room._id);
            if (!deletedRoomCreated) {
                req.flash('error', "Unable to delete your rooms");
                return res.redirect('back');
            }
        }
    }

    roomsPartOf = await ChatRoom.find({});
    if (!roomsPartOf) {
        req.flash('error', "Unable to find your rooms");
        return res.redirect('back');
    }

    roomUpdates = [];
    for (let room of roomsPartOf) {
        if (room.members.includes(user._id)) {
            roomUpdates.push(room._id);
        }
    }

    for (let room of roomUpdates) {
        updatedRoom = await ChatRoom.findByIdAndUpdate(room, {$pull: {members: user._id}});
        if (!updatedRoom) {
            req.flash('error', "Unable to access your rooms");
            return res.redirect('back');
        }
    }

    deletedProjectsPosted = await Project.deleteMany({poster: user._id});
    if (!deletedProjectsPosted) {
        req.flash('error', "Unable to remove you from your projects");
        return res.redirect('back');
    }

    projectsCreated = await Project.find({});
    if (!projectsCreated) {
        req.flash('error', "Unable to find your projects");
        return res.redirect('back');
    }

    projectUpdates = [];
    for (let project of projectsCreated) {
        if (project.creators.includes(user._id)) {
            projectUpdates.push(project._id);
        }
    }

        for (let project of projectUpdates) {
            updatedProject = await Project.findByIdAndUpdate(project, {$pull: {creators: user._id}});
            if (!updatedProject) {
                req.flash('error', "Unable to access your projects");
                return res.redirect('back');
            }
        }
	}

	let deletedUser;
	for (let user of users) {
		deletedUser = await User.findByIdAndDelete(user._id);
		if (!deletedUser) {
			req.flash('error', 'Unable to delete account');
			return res.redirect('back');
		}
        await sendGridEmail(deletedUser.email, 'Profile Deletion Notice', `<p>Hello ${deletedUser.firstName},</p><p>You are receiving this email because your email has been removed from Saberchat's email accesslist. Your account and all of its data has been deleted. Please contact a faculty member if  you think there has been a mistake.</p>`, false);
	}

	req.flash('success', "Email Removed From Access List! Any users with this email have been removed.");
	return res.redirect('/admin/accesslist');
}

controller.viewBalances = async function(req, res) {
    const platform = await setup(Platform);
    const users = await User.find({authenticated: true});
    if (!platform || !users) {
        req.flash('error', 'Could not find users');
        return res.redirect('back');
    }
    return res.render('admin/balances.ejs', {platform, users});
}

controller.updateBalances = async function(req, res) {
    const user = await User.findByIdAndUpdate(req.body.userId, {balance: parseFloat(req.body.bal)});
    if (!user) {
        return res.json({error: "Error. Could not change"});
    }
    return res.json({success: 'Succesfully changed', balance: parseFloat(req.body.bal)});
}

module.exports = controller;