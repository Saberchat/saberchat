//LIBRARIES
const {sendGridEmail} = require("../services/sendGrid");
const {convertToLink} = require("../utils/convert-to-link");
const Filter = require('bad-words');
const filter = new Filter();
const axios = require('axios');
const {cloudUpload, cloudDelete} = require('../services/cloudinary');
const {objectArrIndex, removeIfIncluded, concatMatrix, multiplyArrays, parsePropertyArray, sortAlph} = require('../utils/object-operations');
const setup = require("../utils/setup");
const {autoCompress} = require("../utils/image-compress");

//SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const Email = require('../models/admin/email');
const {ChatMessage, AccessRequest, InboxMessage} = require('../models/notification');
const {Announcement, Project, Article} = require('../models/post');
const Order = require('../models/shop/order');
const {Course, ChatRoom} = require('../models/group');

const controller = {};

if (process.env.NODE_ENV !== "production") {
	require('dotenv').config();
}

controller.index = async function(req, res) {
	const platform = await setup(Platform);
	const users = await User.find({authenticated: true});
	if (!platform || !users) {
		await req.flash("error", "An error occurred");
		return res.redirect("back");
	}

	let statuses = concatMatrix([
		platform.statusesProperty,
		platform.statusesPlural,
		multiplyArrays([], platform.statusesProperty.length)
	]).reverse();

	let reversedPerms = [];
	for (let permission of platform.permissionsProperty) {reversedPerms.unshift(permission);}

	for (let status of statuses) {
		status[2] = [];
		for (let permission of reversedPerms) {
			for (let user of sortAlph(users, "firstName")) {
				if (status[0] == user.status && permission == user.permission) {status[2].push(user);}
			}
		}
	}

	return res.render("profiles/index", {
		platform, users, statuses,
		permMap: new Map(concatMatrix([
			platform.permissionsProperty.slice(1),
			platform.permissionsDisplay.slice(1)
		])),
		emptyStatuses: concatMatrix([
			platform.statusesProperty,
			platform.statusesPlural,
			multiplyArrays([], platform.statusesProperty.length)
		]).reverse()
	});
}

controller.team = async function(req, res) {
	const platform = await setup(Platform);
	const users = await User.find({
		authenticated: true,
		status: {$in: platform.statusesProperty.slice(platform.statusesProperty.length-2)}
	});
	if (!platform || !users) {
		await req.flash("error", "An error occurred");
		return res.redirect("back");
	}
	return res.render("profiles/team", {platform, users});
}

controller.edit = async function(req, res) {
	const platform = await setup(Platform);
	return res.render('profiles/edit', { //Check if user has permissions to change their own tags and statuses
		platform,
		statuses: platform.statusesProperty,
		tags: platform.tags,
		changeStatus: platform.permissionsProperty.slice(platform.permissionsProperty.length-2, platform.permissionsProperty.length).includes(req.user.permission)
	});
}

controller.changeLoginInfo = async function(req, res) {
	const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }
	return res.render('profiles/edit_pwd_email', {platform});
}

controller.show = async function(req, res) {
	const platform = await setup(Platform);
	const user = await User.findById(req.params.id).populate('followers');
	if (!platform || !user) {
		await req.flash('error', 'Error. Cannot find user.');
		return res.redirect('back');
	}

	//Build list of current followers and following
	let followerIds = parsePropertyArray(user.followers, "_id");
	let following = [];
	let currentUserFollowing = [];

	const users = await User.find({authenticated: true});
	if (!users) {
		await req.flash('error', 'Error. Cannot find users.');
		return res.redirect('back');
	}

	for (let u of users) { //Iterate through all users and see if this user is following them
		if (u.followers.includes(user._id)) {following.push(u);}
		if (u.followers.includes(req.user._id)) {currentUserFollowing.push(u);}
	}

	return res.render('profiles/show', {
		platform, user, following, followerIds,
		convertedDescription: convertToLink(user.description),
		perms: new Map(concatMatrix([platform.permissionsProperty, platform.permissionsDisplay])),
		statuses: new Map(concatMatrix([platform.statusesProperty, platform.statusesSingular]))
	});
}

controller.update = async function(req, res) {
	const platform = await setup(Platform);
	const overlap = await User.find({
		authenticated: true,
		username: filter.clean(req.body.username),
		_id: {$ne: req.user._id}
	});
	if (!platform || !overlap) {
		await req.flash('error', "Unable to find users");
		return res.redirect('back');
	} else if (overlap.length > 0) {
		await req.flash('error', "Another user already has that username.");
		return res.redirect('back');
	}

	let status;
	if (req.body.status == '' || !platform.statusesProperty.includes(req.body.status)) { //If no new status is selected, keep the current user's status
		status = req.user.status;
	} else { //If a new status is selected, move to that
		if (req.user.status == platform.teacherStatus && req.body.status != '') { //If user is currently teaching a course, they cannot lose their teacher status
			const courses = await Course.find({});
			if (!courses) {
				await req.flash('error', "Could not find courses");
				return res.redirect('back');
			}
	
			for (let course of courses) {
				if (course.creator.equals(req.user._id)) {
					await req.flash('error', "You are currently teaching a course, and cannot lose your status");
					return res.redirect('back');
				}
			}
			status = req.body.status;
		}
		status = req.body.status;
	}

	let user = { //Updated user object
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		username: filter.clean(req.body.username),
		description: filter.clean(req.body.description),
		title: filter.clean(req.body.title),
		status: status.toLowerCase(),
		mediaFile: {
			url: req.user.mediaFile.url,
			filename: req.user.mediaFile.filename,
			display: req.body.showProfileImage == "upload"
		},
		bannerFile: {
			url: req.user.bannerFile.url,
			filename: req.user.bannerFile.filename,
			display: req.body.showBannerImage == "upload"
		},
	};

	//Build user's image info based on display options on form
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

	//Upload new images for banner and profiles
	if (req.files) {
		let cloudErr;
		let cloudResult;
		if (req.files.mediaFile) { //Profile Image Upload
			if (req.user.mediaFile.filename) {
				[cloudErr, cloudResult] = await cloudDelete(req.user.mediaFile.filename, "image");
				if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
					await req.flash('error', 'Error deleting uploaded image');
					return res.redirect('back');
				}
			}

			const file = req.files.mediaFile[0];
            const processedBuffer = await autoCompress(file.originalname, file.buffer);
            [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
			if (cloudErr || !cloudResult) {
					await req.flash('error', 'Upload failed');
					return res.redirect('back');
			}
			user.mediaFile = { //Update mediaFile info with cloudinary upload URL
				filename: cloudResult.public_id,
				url: cloudResult.secure_url,
				originalName: file.originalname,
				display: req.body.showProfileImage == "upload"
			};
		}

		if (req.files.mediaFile2) { //Banner Image Upload
			if (req.user.bannerFile.filename) {
				[cloudErr, cloudResult] = await cloudDelete(req.user.bannerFile.filename, "image");
				if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
					await req.flash('error', 'Error deleting uploaded image 1');
					return res.redirect('back');
				}
			}

			const file2 = req.files.mediaFile2[0];
            const processedBuffer2 = await autoCompress(file2.originalname, file2.buffer);
            [cloudErr, cloudResult] = await cloudUpload(file2.originalname, processedBuffer2);
			if (cloudErr || !cloudResult) {
				await req.flash('error', 'Upload failed');
				return res.redirect('back');
			}
			user.bannerFile = { //Update bannerFile info with cloudinary upload URL
				filename: cloudResult.public_id,
				url: cloudResult.secure_url,
				originalName: file2.originalname,
				display: req.body.showBannerImage == "upload"
			};
		}
	}

	const updatedUser = await User.findByIdAndUpdate(req.user._id, user); //find and update the user with new info
	if (!updatedUser) {
		await req.flash('error', 'There was an error updating your profile');
		return res.redirect('back');
	}

	await req.flash('success', 'Updated your profile');
	return res.redirect(`/profiles/${req.user._id}`);
}

controller.tagPut = async function(req, res) {
	if (req.user.tags.includes(req.body.tag)) {
		if (req.body.tag == "Tutor") { //If tag is for tutor, check that user is not an active tutor
			const courses = await Course.find({});
			if (!courses) {return res.json({error: 'Error. Could not change'});}
			
			for (let course of courses) {
				if (objectArrIndex(course.tutors, "tutor", req.user._id) > -1) { //If user is a tutor
					return res.json({error: "You are an active tutor"});
				}
			}
		}
		await removeIfIncluded(req.user.tags, req.body.tag); //If no issue, remove tag
		await req.user.save();
		return res.json({success: "Succesfully removed status", tag: req.body.tag, user: req.user._id});
	}
	await req.user.tags.push(req.body.tag);
	await req.user.save();
	return res.json({success: "Succesfully added status", tag: req.body.tag, user: req.user._id});
}

controller.changeEmailPut = async function(req, res) { //Update email
	const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }
	
	req.user.receiving_emails = (req.body.receiving_emails != undefined); //Update receiving emails info
	await req.user.save();

	if (req.user.email == req.body.email) { //If email is not changed, no need to update
		await req.flash('success', "Email sending settings updated");
		return res.redirect(`/profiles/${req.user._id}`);
	}

	//Check if new email is allowed, not blocked, and not already taken
	const allowedEmail = await Email.findOne({address: req.body.email, version: "accesslist"});
	if (!allowedEmail) {
		if (platform.emailExtension != '' && req.body.email.split("@")[1] != platform.emailExtension) {
			await req.flash('error', "New email must be a platform-verified email");
			return res.redirect('back');
		}
	}

	const blocked = await Email.findOne({address: req.body.email, version: "blockedlist"});
	if (blocked) {
		await req.flash('error', "New email must be a platform-verified email");
		return res.redirect('back');
	}

	const overlap = await User.findOne({email: req.body.email, _id: {$ne: req.user._id}});
	if (overlap) {
		await req.flash('error', "Another current or pending user already has that email.");
		return res.redirect('back');
	}

	//Send SendGrid confirmation email to new email address
	const url = process.env.SENDGRID_BASE_URL + '/mail/send';
	const data = {
		"personalizations": [{
			"to": [{"email": req.body.email}],
			"subject": 'Email Update Confirmation'
		}],
		"from": {
			"email": "noreply.saberchat@gmail.com",
			"name": "SaberChat"
		},
		"content": [{
			"type": "text/html",
			"value": `<p>Hello ${req.user.firstName},</p><p>You are receiving this email because you recently requested to change your Saberchat email to ${req.body.email}.</p><p>Click <a href="https://${platform.url}/profiles/confirm-email/${req.user._id}?token=${req.user.authenticationToken}&email=${req.body.email}">this link</a> to confirm your new email address.`
		}]
	};

	axios({
		method: 'post', url, data,
		headers: {"Authorization": "Bearer " + process.env.SENDGRID_KEY}
	}).then(response => {console.log(`Email Sent with status code: ${response.status}`);
	}).catch(error => {console.log(error);});

	await req.flash('success', 'Go to your new email to confirm new address');
	return res.redirect('/profiles/change-login-info');
}

controller.confirmEmail = async function(req, res) {
	const user = await User.findById(req.params.id);
	if (!user) {
		await req.flash('error', "Unable to find user");
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

	//If user's authentication matches queried token (meaning origin is correct)
	if (req.query.token.toString() == user.authenticationToken) {
		user.email = req.query.email;
		user.authenticationToken = token;
		await user.save();

		await sendGridEmail(user, 'Email Update Confirmation', `<p>Hello ${user.firstName},</p><p>You are receiving this email because you recently made changes to your Saberchat email. This is a confirmation of your profile.</p><p>Your username is ${user.username}.</p><p>Your full name is ${user.firstName} ${user.lastName}.</p><p>Your email is ${user.email}.</p>`, false);
		req.flash('success', "Email updated!")
		return res.redirect('/');
	}
	await req.flash('error', "Invalid authentication token");
	return res.redirect('/');
}

controller.changePasswordPut = async function(req, res) {
	if (req.body.newPassword == req.body.newPasswordConfirm) {  //If confirmation passwords match
		const user = await User.findById(req.user._id);
		if (!user) {
			req.flash('error', 'Error, cannot find user');
			return res.redirect('/');
		}

		await user.changePassword(req.body.oldPassword, req.body.newPassword); //Update user's password
		await sendGridEmail(req.user.email, 'Password Update Confirmation', `<p>Hello ${req.user.firstName},</p><p>You are receiving this email because you recently made changes to your Saberchat password. This is a confirmation of your profile.\n\nYour username is ${req.user.username}.\nYour full name is ${req.user.firstName} ${req.user.lastName}.\nYour email is ${req.user.email}\n\nIf you did not recently change your password, reset it immediately and contact a faculty member.</p>`, false);
		await req.flash('success', 'Successfully changed your password');
		return res.redirect('/profiles/' + req.user._id);
	}
	await req.flash('error', "Passwords do not match");
	return res.redirect('back');
}

controller.follow = async function(req, res) {
	const user = await User.findById(req.params.id);
	if (!user) {return res.json({error: "Error finding user"});}
	if (user.followers.includes(req.user._id)) {return res.json({error: "You are already following this user"});}
	if (user.blocked.includes(req.user._id)) {return res.json({error: "User has blocked you"});}
	if (user._id.equals(req.user._id)) {return res.json({error: "You may not follow yourself"});}

	await user.followers.push(req.user);
	await user.save();
	return res.json({success: "Succesfully followed user", user: req.user});
}

controller.unfollow = async function(req, res) {
	const user = await User.findById(req.params.id);
	if (!user) {return res.json({error: "Error finding user"});}

	//Try to unfollow; if user is not following person, then do not process
	if (await removeIfIncluded(user.followers, req.user._id)) {
		await user.save();
		return res.json({success: "Unfollowed user", user: req.user});
	}
	return res.json({error: "You are not following this user"});
}

controller.remove = async function(req, res) {
	const user = await User.findById(req.params.id);
	if (!user) {return res.json({error: "Error finding user"});}

	//Try to remove follower from user; if person is not following user, then do not process
	if (await removeIfIncluded(req.user.followers, user._id)) {
		await req.user.blocked.push(user._id);
		await req.user.save();
		return res.json({success: "Succesfully removed user"});
	}
	return res.json({error: "User is not following you"});
}

controller.unblock = async function(req, res) {
	const user = await User.findById(req.params.id);
	if (!user) {return res.json({error: "Error finding user"});}

	//Try to remove follower from user's blocked list; if person is not following user, then do not process
	if (await removeIfIncluded(req.user.blocked, user._id)) {
		await req.user.save();
		return res.json({success: "Succesfully unblocked user"});
	}
	return res.json({error: "You have not unblocked this user"});
}

//DELETE ACCOUNT. CURRENTLY DISABLED ROUTE
controller.deleteAccount = async function(req, res)  {
	req.user.archived = true;
	await req.user.save();
	await req.flash("Archived your account!")
	await req.logout();
	return res.redirect('/');
}

module.exports = controller;