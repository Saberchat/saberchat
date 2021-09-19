//LIBRARIES
const {sendGridEmail} = require("../services/sendGrid");
const {objectArrIndex, concatMatrix, removeIfIncluded} = require("../utils/object-operations");
const setup = require("../utils/setup");
const {cloudUpload, cloudDelete} = require('../services/cloudinary');
const {autoCompress} = require("../utils/image-compress");
const dateFormat = require("dateformat");

//SCHEMA
const Platform = require("../models/platform");
const {ChatMessage} = require('../models/notification');
const User = require("../models/user");
const Email = require("../models/admin/email");
const {Course, ChatRoom} = require('../models/group');

const controller = {};

controller.updatePlatformForm = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }
    return res.render("admin/settings", {platform, objectArrIndex});
}

controller.updatePlatform = async function(req, res) {
    const platform = await setup(Platform);
    const users = await User.find({});
    if (!platform || !users) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

    if (req.files) {
        if (req.files.mediaFile) {
            let cloudErr;
            let cloudResult;
            if (platform.displayVideo && platform.displayVideo.filename) {
                [cloudErr, cloudResult] = await cloudDelete(platform.displayVideo.filename, "video");
                if (cloudErr || !cloudResult || cloudResult.result !== "ok") { // check for failure
                    await req.flash("error", "Error deleting video");
                    return res.redirect("back");
                }
            }
            
            const file = req.files.mediaFile[0];
            const processedBuffer = await autoCompress(file.originalname, file.buffer);
            [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);

            if (cloudErr || !cloudResult) {
                await req.flash("error", "Upload failed");
                return res.redirect("back");
            }

            platform.displayVideo = {
                filename: cloudResult.public_id,
                url: cloudResult.secure_url,
                originalName: file.originalname,
                display: false
            };
        }
    }

    const oldAddress = platform.emailExtension;
    for (let attr of ["name", "description", "postText", "imageUrl", "emailExtension", "officialEmail", "displayImages", "font", "balanceMessage"]) { //Update elements with directly corresponding text
        platform[attr] = req.body[attr];
    }

    for (let attr of ["navDark", "contactPhotoDisplay", "postVerifiable", "enableDarkmode", "homepageInfo", "restrictPosts"]) {
        platform[attr] = (req.body[attr] != undefined);
    }

    for (let attr of ["community", "services", "terms"]) { //Update elements which are textareas with split text
        platform[attr] = [];
        for (let element of await req.body[attr].split('\n')) {
            if (await element.split('\r').join('').split(' ').join('') != "") {
                await platform[attr].push(element);
            }
        }
    }

    platform.updateTime = `${req.body.day} ${req.body.month}`;
    platform.colorScheme = [];
    for (let i = 0; i < req.body.colorScheme.length; i+= 3) {
        await platform.colorScheme.push(`${req.body.colorScheme[i]}, ${req.body.colorScheme[i+1]}, ${req.body.colorScheme[i+2]}`);
    }

    platform.info = [];
    let parsedText = [];
    for (let i = 0; i < req.body.infoHeading.length; i++) { //Update about information
        parsedText = [];
        for (let element of req.body.infoText[i].split('\n')) {
            if (await element.split('\r').join('').split(' ').join('') != "") {
                await parsedText.push(element);
            }
        }
        await platform.info.push({
            heading: req.body.infoHeading[i],
            text: parsedText,
            image: req.body.infoImages[i]
        });
    }

    platform.contact =  {heading: req.body.contactHeading, description:[]};
    for (let element of await req.body.contactInfo.split('\n')) { //Iterate through contact info
        if (await element.split('\r').join('').split(' ').join('') != "") {
            await platform.contact.description.push(element);
        }
    }

    if (typeof req.body.feature == "string") {
        if (await objectArrIndex(platform.publicFeatures, "name", platform.features[0].name) > -1) {
            platform.publicFeatures[0].icon = req.body.featureIcon;
            platform.publicFeatures[0].name = req.body.feature;
        }

        platform.features[0].name = req.body.feature;
        platform.features[0].icon = req.body.featureIcon;
        platform.features[0].description = req.body.featureDescription;
    } else {
        for (let i = 0; i < platform.features.length; i++) {
            if (await objectArrIndex(platform.publicFeatures, "name", platform.features[i].name) > -1) {
                platform.publicFeatures[await objectArrIndex(platform.publicFeatures, "name", platform.features[i].name)].icon = req.body.featureIcon[i];
                platform.publicFeatures[await objectArrIndex(platform.publicFeatures, "name", platform.features[i].name)].name = req.body.feature[i];
            }
            platform.features[i].name = req.body.feature[i];
            platform.features[i].icon = req.body.featureIcon[i];
            platform.features[i].description = req.body.featureDescription[i];
        }
    }

    const oldPerms = platform.permissionsProperty;
    const oldStatuses = platform.statusesProperty;

    platform.permissionsProperty = [];
    platform.permissionsDisplay = [];

    for (let i = req.body.permissionProperty.length-1; i >= 0; i--) {
        await platform.permissionsProperty.push(req.body.permissionProperty[i]);
        await platform.permissionsDisplay.push(req.body.permissionDisplay[i]);
    }

    platform.statusesProperty = [];
    platform.statusesSingular = [];
    platform.statusesPlural = [];

    for (let i = req.body.statusSingular.length-1; i >= 0; i--) {
        await platform.statusesProperty.push(req.body.statusProperty[i]);
        await platform.statusesSingular.push(req.body.statusSingular[i]);
        await platform.statusesPlural.push(req.body.statusPlural[i]);
    }

    for (let user of users) {
        user.permission = platform.permissionsProperty[oldPerms.indexOf(user.permission)];
        user.status = platform.statusesProperty[oldStatuses.indexOf(user.status)];
        await user.save();
    }
    
    if (oldAddress != req.body.emailExtension) { //Update all users who were by default allowed earlier
        let email;
        for (let user of users) {
            if (await user.email.split('@')[1] == oldAddress) {
                email = await Email.create({address: user.email, version: "accesslist"});
                if (!email) {
                    await req.flash("error", "Unable to create new email");
                    return res.redirect("back");
                }
            }
        }

        const emails = await Email.find({version: "accesslist"});
        for (let email of emails) {
            if (await email.address.split('@')[1] == req.body.emailExtension) { //Remove now-unnecessary emails from access list
                email = await Email.findByIdAndDelete(email._id);
                if (!email) {
                    await req.flash("error", "Unable to delete email");
                    return res.redirect("back");
                }
            }
        }
    }

    await platform.save();
    await req.flash("success", "Updated platform settings!");
    return res.redirect("/admin/settings");
}

controller.authenticateGet = async function(req, res) { //Access page where users are authenticated
    const platform = await setup(Platform);
    let users = await User.find({authenticated: false});
    if (!platform || !users) {
        await req.flash('error', "Unable to find users");
        return res.redirect('back');
    }

    if (!platform.principalAuthenticate) { //If principal does not have perms to authenticate users
        await req.flash('error', `${platform.permissionsDisplay[platform.permissionsDisplay.length-1]} Authentication is not enabled on ${platform.name} Saberchat`);
        return res.redirect('back');
    }

    let accesslistedEmail;
    for (let i = users.length-1; i >= 0; i--) { //Iterate through users and check if any of them already have permissions to create account
        accesslistedEmail = await Email.findOne({address: req.user.email, version: "accesslist"});
        if (accesslistedEmail || (await users[i].email.split(' ').join('').split("@")[1] == platform.emailExtension)) {
            await users.splice(i, 1);
        }
    }
    return res.render('admin/authenticate', {platform, users});
}

controller.authenticatePut = async function(req, res) { //Authenticate new user from principal's control panel
    const platform = await setup(Platform);
    if (!platform) { return res.json({error: "Unable to set up platform"});}
    if (!platform.principalAuthenticate) {
        return res.json({error: `${platform.permissionsDisplay[platform.permissionsDisplay.length-1]} Authentication is not enabled on ${platform.name} Saberchat`});
    }
    const user = await User.findByIdAndUpdate(req.body.userId, {authenticated: true});
    if (!user) { return res.json({error: "Unable to find user"});}
    await sendGridEmail(user.email, 'Welcome To Saberchat!', `<p>Hello ${user.firstName},</p><p>Welcome to Saberchat! A confirmation of your account:</p><ul><li>Your username is ${user.username}.</li><li>Your full name is ${user.firstName} ${user.lastName}.</li><li>Your linked email is ${user.email}</li></ul><p>You will be assigned a role and status soon.</p>`, false);
    return res.json({success: "Authenticated User!"});
}

controller.authenticateDelete = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) { return res.json({error: "Unable to set up platform"});}
    if (!platform.principalAuthenticate) {
        return res.json({error: `${platform.permissionsDisplay[platform.permissionsDisplay.length-1]} Authentication is not enabled on ${platform.name} Saberchat`});
    }
    const user = await User.deleteOne({_id: req.body.userId, authenticated: false});
    if (!user) { return res.json({error: "Unable to find user"});}
    return res.json({success: "Removed User!"});
}

controller.moderateGet = async function(req, res) { //Show all reported comments
    const platform = await setup(Platform);
    const comments = await ChatMessage.find({status: 'flagged'}).populate("author statusBy room");
    const rooms = await ChatRoom.find();
    if (!platform || !comments || !rooms) {
        await req.flash('error', 'An Error Occurred');
        return res.redirect('/admin');
    }
    const roomMap = new Map();
    for (let comment of comments) {
        for (let room of rooms) {
            if (await room.comments.includes(comment._id)) {await roomMap.set(comment._id, room);}
        }
    }
    return res.render('admin/mod', {platform, comments, rooms: roomMap});
}

controller.getContext = async function(req, res) { //Get context for reported comment
    const reportedComment = await ChatMessage.findById(req.body.commentId).populate("author");
    if (!reportedComment) {return res.json({error: "Unable to find comment"});}

    let allComments; //All comments from reported room
    let commentIndex;
    let context = []; //Comments 5 before and 5 after
    const rooms = await ChatRoom.find({}).populate({path: "comments", populate: "author"});
    for (let room of rooms) {
        if (await objectArrIndex(room.comments, "_id", reportedComment._id) > -1) {
            allComments = room.comments;
            commentIndex = await objectArrIndex(allComments, "_id", reportedComment._id);  //Get pos of reported comment
            break;
        }
    }

    //Find the comments 5 before and 5 after the reported one, and add to array
    for (let i = -5; i <= 5; i++) {
        if (commentIndex + i >= 0 && allComments[commentIndex + i].author) {
            await context.push(allComments[commentIndex + i]);
        }
    }

    return res.json({success: "Succesfully collected data", context});
}

controller.ignoreComment = async function(req, res) { //Ignore comment
    const comment = await ChatMessage.findById(req.body.commentId).populate('statusBy');
    if (!comment) { return res.json({error: 'Could not find comment'});}

    //Users cannot handle comments that they have written/reported
    if (await comment.author.equals(req.user._id) || await comment.statusBy._id.equals(req.user._id)) {
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
    if (await comment.author.equals(req.user._id) || await comment.statusBy._id.equals(req.user._id)) {
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
        await req.flash('error', 'An Error Occurred');
        return res.redirect('/admin');
    }
    
    return res.render('admin/permission', {
        platform, users,
        statusMatrix: await concatMatrix([
            platform.statusesProperty,
            platform.statusesPlural
        ]),
        permMatrix: await concatMatrix([
            platform.permissionsProperty,
            platform.permissionsDisplay
        ]).reverse()
    });
}

controller.statusGet = async function(req, res) { //Show page with all users and their statuses
    const platform = await setup(Platform);
    const users = await User.find({authenticated: true});
    if (!platform || !users) {
        await req.flash('error', 'An Error Occurred');
        return res.redirect('/admin');
    }

    return res.render('admin/status', {
        platform, users,
        tags: platform.tags, //List of tags that can be added/removed to tutors
        statusMatrix: await concatMatrix([
            platform.statusesProperty,
            platform.statusesSingular
        ]).reverse(),
        permMatrix: await concatMatrix([
			platform.permissionsProperty,
			platform.permissionsDisplay
		]).reverse()
    });
}

controller.permissionsPut = async function(req, res) { //Update a user's permissions
    const platform = await setup(Platform);
    const user = await User.findById(req.body.userId);
    if (!platform || !user) {
        return res.json({error: "Error. Could not change"});
    }

    if (await platform.permissionsProperty.slice(platform.permissionsProperty.length-2).includes(req.body.role)) { //Changing a user to higher level permissions requires specific permissions
        if (req.user.permission == platform.permissionsProperty[platform.permissionsProperty.length-1]) { // check if current user is the highest permission
            user.permission = req.body.role;
            await user.save();
            return res.json({success: "Succesfully changed", user});
        }
        return res.json({error: "You do not have permissions to do that", user});
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
        if (!courses) {return res.json({error: "Error. Could not change", user});}
        for (let course of courses) {
            if (await course.creator.equals(user._id)) {return res.json({error: "User is an active teacher", user});}
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
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

    let emails;
    if (req.query.version) { //If user wants a specific email list
        if (await ["accesslist", "blockedlist"].includes(req.query.version)) {
            emails = await Email.find({address: {$ne: req.user.email}, version: req.query.version});
        } else { //If list is not access list or blocked list, use the access list
            emails = await Email.find({address: {$ne: req.user.email}, version: "accesslist"});
        }
    } else { //If list is not specified, use the access list
        emails = await Email.find({address: {$ne: req.user.email}, version: "accesslist"});
    }

    if (!emails) {
        await req.flash('error', "Unable to find emails");
        return res.redirect('back');
    }

    const users = await User.find({});
    if (!users) {
        await req.flash('error', "Unable to find users");
        return res.redirect('back');
    }

    if (req.query.version) { //Display list based on specified version
        if (await ["accesslist", "blockedlist"].includes(req.query.version)) {
            return res.render('admin/accesslist', {platform, emails, users, version: req.query.version});
        }
    }
    return res.render('admin/accesslist', {platform, emails, users, version: "accesslist"});
}

controller.addEmail = async function(req, res) { //Add email to access list/blocked list
    const platform = await setup(Platform);
    if (!platform) return res.json({error: "An error occurred"});
    const textSplitter = new RegExp(/[\,\s\'\r\n]/, 'g');
    let user;
    let overlap;
    let validEmail; //Tracks if current iterated email is valid or not
    let newEmail; //Used to create new emails every time an email address is iterated over
    let validEmails = []; //Stores all valid emails that have been parsed

    let emails = await req.body.address.split(textSplitter);  //Regex parses out all valid emails from list
    while (await emails.includes('')) { //Remove all '' delimeters from string
        await emails.splice(emails.indexOf(''), 1);
    }

    for (let email of emails) { //Iterate through each email and validate that it needs/can be placed on access list
        email = email.split(' ').join('')
        validEmail = true;
        user = await User.findOne({email});
        if (req.body.version === "accesslist") {
            if (user || (platform.emailExtension != '' && ((await email.split('@')[1]) === platform.emailExtension))) { //These emails are already verified
                validEmail = false;
            }
        }

        overlap = await Email.findOne({address: email});
        if (overlap) {validEmail = false;} //If any emails overlap, don't create the new email

        if (req.body.version == "blockedlist") {
            if (user) {validEmail = false;}
        }

        if (validEmail) { //Create email if there are no bugs in email creation
            newEmail = await Email.create({address: email, version: req.body.version});
            if (!email) {return res.json({error: "Error creating email"});}
            validEmails.push(newEmail);
        }
    }

    return res.json({success: "Email added", emails: validEmails});
}

controller.deleteEmail = async function(req, res) { //Remove email from access list/blocked list
    const email = await Email.findById(req.body.emailId);
    if (!email) {return res.json({error: "Unable to find email"});}

    const users = await User.find({email: email.address}); //Find users with this email
    if (!users) {return res.json({error: "Unable to find users"});}

    if (users.length === 0) { //If nobody currently has this email, remove it
        const deletedEmail = await Email.findByIdAndDelete(email._id);
        if (!deletedEmail) {return res.json({error: "Unable to delete email"});}
        return res.json({success: "Deleted email"});
    }
    return res.json({error: "A user with this email exists"}); //If someone has this email, don't remove it
}

controller.tag = async function(req, res) { //Add/remove status tag to user
    const user = await User.findById(req.body.userId);
    if (!user) {return res.json({error: 'Error. Could not change'});}
    if (await user.tags.includes(req.body.tag)) { //If user already has this tag (in which case, remove it)
        if (req.body.tag == "Tutor") { //
            const courses = await Course.find({});
            if (!courses) {return res.json({error: 'Error. Could not change'});}
            for (let course of courses) { //Iterate through courses and see if user is a tutor in any of them
                if (await objectArrIndex(course.tutors, "tutor", user._id) > -1) {
                    return res.json({error: "User is an Active Tutor"});
                }
            }

            //If there is no error, remove the tag
            await removeIfIncluded(user.tags, req.body.tag);
            await user.save();
            return res.json({success: "Successfully removed status", tag: req.body.tag})
        }

        //Remove the tag
        await removeIfIncluded(user.tags, req.body.tag);
        await user.save();
        return res.json({success: "Successfully removed status", tag: req.body.tag})
    }

    //If user does not already have this tag, add it
    await user.tags.push(req.body.tag);
    await user.save();
    return res.json({success: "Successfully added status", tag: req.body.tag})
}

controller.viewBalances = async function(req, res) {
    const platform = await setup(Platform);
    const users = await User.find({authenticated: true});
    if (!platform || !users) {
        await req.flash('error', 'Could not find users');
        return res.redirect('back');
    }
    return res.render('admin/balances.ejs', {platform, users});
}

controller.updateBalances = async function(req, res) {
    const platform = await setup(Platform);
    const user = await User.findById(req.body.userId);

    if (!platform || !user) { return res.json({error: "Error. Could not change"});}

    if (user.balance - (await parseFloat(req.body.bal)) != 0) { //If deposit is not 0 then user's transactions are updated
        user.deposits.push({
            amount: user.balance - (await parseFloat(req.body.bal)),
            added: new Date()
        });
    }

    user.balance =  await parseFloat(req.body.bal);
    await user.save();

    if (platform.dollarPayment) {
        await sendGridEmail(user.email, "Balance Update", `<p>Hello ${user.firstName},</p><p>Your balance has been updated to $${await user.balance.toFixed(2)}!</p><p>${platform.balanceMessage}</p><p>Visit ${platform.url} to check out our merchandise.</p>`, false);
    } else {
        await sendGridEmail(user.email, "Balance Update", `<p>Hello ${user.firstName},</p><p>Your balance has been updated to ${user.balance} Credits!</p><p>${platform.balanceMessage}</p><p>Visit ${platform.url}/shop to check out our merchandise.</p>`, false);
    }
    
    if (platform.dollarPayment) {return res.json({success: 'Succesfully changed', balance: (await parseFloat(req.body.bal)).toFixed(2)});}
    return res.json({success: 'Succesfully changed', balance: (await parseInt(req.body.bal))});
}

module.exports = controller;