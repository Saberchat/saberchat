// LIBRARIES

// Email service
const {sendGridEmail} = require("../services/sendGrid"); 
// string utilities
const {convertToLink, embedLink} = require("../utils/convert-to-link"); 
// object utilities
const {objectArrIndex, removeIfIncluded, parsePropertyArray} = require("../utils/object-operations");
// setup function
const setup = require("../utils/setup"); 
const path = require('path');
// for date manipulation
const dateFormat = require('dateformat'); 
// for media uploads
const {cloudUpload, cloudDelete} = require('../services/cloudinary');
// for media compression
const {autoCompress} = require("../utils/image-compress");

// SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const {Announcement, PostComment} = require('../models/post');
const {InboxMessage} = require('../models/notification');

const controller = {}; // initialize controller object

// GET: Announcement index
controller.index = async function(req, res) {
    const platform = await setup(Platform);
    const users = await User.find({authenticated: true});
    if (!platform || !users) {
        req.flash('error', 'An Error Occurred');
        return res.redirect('back');
    }

    let announcements;
    if (req.user && await platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission)) {
        // get all announcements
        announcements = await Announcement.find({}).populate('sender');
    } else if (!req.user) {
        // get all public announcements
        announcements = await Announcement.find({verified: true, public: { $ne: false }}).populate('sender');
    } else {
        // get all verified announcements
        announcements = await Announcement.find({verified: true}).populate('sender');
    }
    if(!announcements) {
        req.flash('error', 'Cannot find announcements.');
        return res.redirect('back');
    }

    const userNames = parsePropertyArray(users, "firstName").join(',').toLowerCase().split(',');
    const announcementTexts = await embedLink(req.user, announcements, userNames);

    return res.render('announcements/index', {platform, announcements: await announcements.reverse(), announcementTexts});
};

// GET: Announcement new ann form
controller.new = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }
    return res.render('announcements/new', {platform});
};

// GET: Announcement mark-all ann as read
controller.markAll = async function(req, res) {
    req.user.annCount = []; // No new announcements in user's annCount
    await req.user.save();
    req.flash('success', 'All Announcements Marked As Read!');
    return res.redirect(`/announcements`);
};

// GET: Announcement mark-one ann as read
controller.markOne = async function(req, res) {
    // If user's annCount includes announcement, remove it
    if (objectArrIndex(req.user.annCount, "announcement", req.params.id) > -1) {
        await req.user.annCount.splice(objectArrIndex(req.user.annCount, "announcement", req.params.id), 1);
        await req.user.save();
    }
    req.flash('success', 'Announcement Marked As Read!');
    return res.redirect(`/announcements`);
};

// GET: Announcement show
controller.show = async function(req, res) {
    const platform = await setup(Platform);
    // get announcement by id
    const announcement = await Announcement.findById(req.params.id)
        .populate('sender')
        .populate({
            path: "comments",
            populate: {path: "sender"}
        });
    if(!platform || !announcement) {
        req.flash('error', 'Could not find announcement');
        return res.redirect('back');
    } else if (!announcement.verified && !(await platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission))) {
        req.flash('error', 'You cannot view that announcement');
        return res.redirect('back');
    }

    if(req.user) {
        // If this announcement is new to the user, it is no longer new, so remove it
        if (objectArrIndex(req.user.annCount, "announcement", announcement._id, "_id") > -1) {
            await req.user.annCount.splice(objectArrIndex(req.user.annCount, "announcement", announcement._id, "_id"), 1);
            await req.user.save();
        }
    }

    let fileExtensions = new Map(); // Track which file format each attachment is in
    for (let media of announcement.mediaFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    // Parse and add hrefs to all links in text
    const convertedText = await convertToLink(announcement.text); 
    // Render announcement page
    return res.render('announcements/show', {platform, announcement, convertedText, fileExtensions});
};

// GET: Announcement edit form
controller.updateForm = async function(req, res) {
    const platform = await setup(Platform);
    const announcement = await Announcement.findById(req.params.id);
    if(!platform || !announcement) {
        req.flash('error', 'Could not find announcement');
        return res.redirect('back');
    }
    // Only the sender may edit the announcement
    if(!(await announcement.sender.equals(req.user._id))) { 
        req.flash('error', 'You do not have permission to do that.');
        return res.redirect('back');
    }

    let fileExtensions = new Map(); // Track which file format each attachment is in
    for (let media of announcement.mediaFiles) {
        fileExtensions.set(media.url, path.extname(await media.url.split("SaberChat/")[1]));
    }
    // Render edit form
    return res.render('announcements/edit', {platform, announcement, fileExtensions});
};

// POST: Announcement create
controller.create = async function(req, res) {
    const platform = await setup(Platform);
    const announcement = await Announcement.create({
        sender: req.user,
        subject: req.body.subject,
        text: req.body.message,
        // Announcement does not need to be verified if platform
        // does not support verifying announcements.
        verified: !platform.postVerifiable
    });
    if (!platform || !announcement) {
        req.flash('error', 'Unable to create announcement');
        return res.redirect('back');
    }
    if (req.body.public && req.body.public === 'False') {
        announcement.public = false; // no access to visitors without accounts/not logged in
    }
    // If any images were added (if not, the 'images' property is empty)
    if (req.body.images) {announcement.images = req.body.images;}

    // if files were uploaded, process them
    if (req.files) {
        if (req.files.mediaFile) { // if files in POST
            let cloudErr;
            let cloudResult;
            for (let file of req.files.mediaFile) { // Upload each file to cloudinary
                // attempt to compress files
                const processedBuffer = await autoCompress(file.originalname, file.buffer);
                // upload files to Cloudinary
                [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
                if (cloudErr || !cloudResult) {
                    req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }
                // add files to database record
                await announcement.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }
    // get pre-formatted date for readability.
    announcement.date = dateFormat(announcement.created_at, "h:MM TT | mmm d");
    await announcement.save();
    // If announcement does not need verification
    if (!platform.postVerifiable) {
        const users = await User.find({authenticated: true, _id: {$ne: req.user._id}});
        if (!users) {
            req.flash('error', "An Error Occurred");
            return res.redirect('back');
        }

        let imageString = ""; // Build string of all attached images
        for (const image of announcement.images) {imageString += `<img src="${image}">`;}
        for (let user of users) { // Send email to all users
            if (user.receiving_emails) {
                const emailText = `<p>Hello ${user.firstName},</p><p>${req.user.username} has recently posted a new announcement - '${announcement.subject}'.</p><p>${announcement.text}</p><p>You can access the full announcement at https://${platform.url}</p> ${imageString}`;
                await sendGridEmail(user.email, `New Saberchat Announcement - ${announcement.subject}`, emailText, false);
                await user.annCount.push({announcement, version: "new"});
                await user.save();
            }
        }
        req.flash('success', `Announcement Posted!`);
    } else {
        // Send alternative message if announcement needs verification
        req.flash('success', `Announcement Posted! A platform ${await platform.permissionsDisplay[platform.permissionsDisplay.length-1].toLowerCase()} will verify your post soon.`);
    }
    return res.redirect(`/announcements`);
};

// GET: verify announcement
controller.verify = async function(req, res) {
    const platform = await setup(Platform);
    // Update announcement so verified status = true
    const announcement = await Announcement.findByIdAndUpdate(
        req.params.id, 
        { verified: true }
    ).populate("sender");

    if (!platform || !announcement) {
        req.flash('error', "Unable to access announcement");
        return res.redirect('back');
    }

    // Check if platform requires verification
    if (platform.postVerifiable) {
        // Get all users except the current user
        const users = await User.find({authenticated: true, _id: {$ne: req.user._id}});
        if (!users) {
            req.flash('error', "An Error Occurred");
            return res.redirect('back');
        }

        let imageString = ""; // Build string of all attached images
        for (const image of announcement.images) {imageString += `<img src="${image}">`;}
        for (let user of users) { // Send email to all users
            if (user.receiving_emails) {
                const emailText = `<p>Hello ${user.firstName},</p><p>${announcement.sender.username} has recently posted a new announcement - '${announcement.subject}'.</p><p>${announcement.text}</p><p>You can access the full announcement at https://${platform.url}</p> ${imageString}`;
                await sendGridEmail(user.email, `New Saberchat Announcement - ${announcement.subject}`, emailText, false);
                await user.annCount.push({announcement, version: "new"});
                await user.save();
            }
        }
    }

    req.flash("success", "Verified Announcement!");
    return res.redirect("/announcements");
}

// PUT: Announcement Update
controller.updateAnnouncement = async function(req, res) {
    const platform = await setup(Platform);
    const announcement = await Announcement.findById(req.params.id).populate('sender');
    if (!platform || !announcement) {
        req.flash('error', "Unable to access announcement");
        return res.redirect('back');
    }

    // Make sure user is ann author.
    if(!(await announcement.sender.equals(req.user._id))) { 
        req.flash('error', "You can only update announcements which you have sent");
        return res.redirect('back');
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(req.params.id, {
        subject: req.body.subject,
        text: req.body.message,
        // Announcement does not need to be verified if platform
        // does not support verifying announcements.
        verified: !platform.postVerifiable
    });
    if (!updatedAnnouncement) {
        req.flash('error', "Unable to update announcement");
        return res.redirect('back');
    }

    // set announcement 'public' status
    if (req.body.public && req.body.public === 'False') {
        // no access to visitors without accounts/not logged in
        updatedAnnouncement.public = false; 
    } else {
        updatedAnnouncement.public = true;
    }

    // Only add images if any are provided
    if (req.body.images) {updatedAnnouncement.images = req.body.images;}

    // Iterate through all selected media to remove and delete them
    let cloudErr;
    let cloudResult;
    for (let i = updatedAnnouncement.mediaFiles.length-1; i >= 0; i--) {
        if (req.body[`deleteUpload-${updatedAnnouncement.mediaFiles[i].url}`] && updatedAnnouncement.mediaFiles[i] && updatedAnnouncement.mediaFiles[i].filename) {
            // Evaluate filetype to decide on file deletion strategy
            switch(path.extname(await updatedAnnouncement.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase()) {
                case ".mp3":
                case ".mp4":
                case ".m4a":
                case ".mov":
                    [cloudErr, cloudResult] = await cloudDelete(updatedAnnouncement.mediaFiles[i].filename, "video");
                    break;
                case ".pdf":
                    [cloudErr, cloudResult] = await cloudDelete(updatedAnnouncement.mediaFiles[i].filename, "pdf");
                    break;
                default:
                    [cloudErr, cloudResult] = await cloudDelete(updatedAnnouncement.mediaFiles[i].filename, "image");
            }

            // Check For Failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
            await updatedAnnouncement.mediaFiles.splice(i, 1);
        }
    }

    // if files were uploaded
    if (req.files) {
        if (req.files.mediaFile) {
            // Iterate through all new attached media
            for (let file of req.files.mediaFile) {
                // attempt media compression
                const processedBuffer = await autoCompress(file.originalname, file.buffer);
                // upload to cloudinary
                [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
                if (cloudErr || !cloudResult) {
                    req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }
                // add files to database record
                await updatedAnnouncement.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }

    await updatedAnnouncement.save();
    // get all users except current user
    const users = await User.find({authenticated: true, _id: {$ne: req.user._id}});
    if (!users) {
        req.flash('error', "An Error Occurred");
        return res.redirect('back');
    }

    let imageString = "";
    for (let image of announcement.images) {imageString += `<img src="${image}">`;}
    for (let user of users) {
        // If announcement not already in user's annCount, add it
        if (objectArrIndex(user.annCount, "announcement", updatedAnnouncement._id) == -1) {
            await user.annCount.push({announcement: updatedAnnouncement, version: "updated"});
            await user.save();
        }
    }

    req.flash('success', 'Announcement Updated!');
    return res.redirect(`/announcements`);
}

// PUT: Like Announcement
controller.likeAnnouncement = async function(req, res) {
    const announcement = await Announcement.findById(req.body.announcementId);
    if(!announcement) {return res.json({error: 'Error updating announcement.'});}

    if (removeIfIncluded(announcement.likes, req.user._id)) { // Remove like
        await announcement.save();
        return res.json({ // send json to frontend
            success: `Removed a like from ${announcement.subject}`,
            likeCount: announcement.likes.length
        });
    }
    
    await announcement.likes.push(req.user._id);
    await announcement.save();
    return res.json({ // send json to frontend
        success: `Liked ${announcement.subject}`,
        likeCount: announcement.likes.length
    });
};

// PUT: Announcement comment
controller.comment = async function(req, res) {
    const announcement = await Announcement.findById(req.body.announcementId)
        .populate({
            path: "comments",
            populate: {path: "sender"}
        });
    if (!announcement) {return res.json({error: 'Error commenting'});}

    const comment = await PostComment.create({
        text: await req.body.text.split('<').join('&lt'),
        sender: req.user
    });
    if (!comment) {return res.json({error: 'Error commenting'});}

    // get pre-formatted date for readability
    comment.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
    await comment.save();

    await announcement.comments.push(comment);
    await announcement.save();

    let users = [];
    let user;
    // find mentions in text
    for (let line of await comment.text.split(" ")) {
        if (line[0] == '@') {
            user = await User.findById(await line.split("#")[1].split("_")[0]);
            if (!user) {return res.json({error: "Error accessing user"});}
            await users.push(user);
        }
    }

    // notify users of mention
    let notif;
    for (let user of users) {
        notif = await InboxMessage.create({
            subject: `New Mention in ${announcement.subject}`,
            author: req.user,
            noReply: true,
            recipients: [user],
            read: [],
            toEveryone: false,
            images: []
        });
        if (!notif) {return res.json({error: "Error creating notification"});}

        notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
        notif.text = `Hello ${user.firstName},\n\n${req.user.firstName} ${req.user.lastName} mentioned you in a comment on "${announcement.subject}":\n${comment.text}`;
        await notif.save();

        if (user.receiving_emails) {
            await sendGridEmail(user.email, `New Mention in ${announcement.subject}`, `<p>Hello ${user.firstName},</p><p>${req.user.firstName} ${req.user.lastName} mentioned you in a comment on <strong>${announcement.subject}</strong>.<p>${comment.text}</p>`, false);
        }

        await user.inbox.push({message: notif, new: true}); //Add notif to user's inbox
        await user.save();
    }

    return res.json({ // send json to frontend
        success: 'Successful comment',
        comments: announcement.comments
    });
}

// PUT: Announcement like comment
controller.likeComment = async function(req, res) {
    const comment = await PostComment.findById(req.body.commentId);
    if(!comment) {return res.json({error: 'Error finding comment'});}

    if (removeIfIncluded(comment.likes, req.user._id)) {
        await comment.save();
        return res.json({
            success: `Removed a like`,
            likeCount: comment.likes.length
        });
    }

    await comment.likes.push(req.user._id); // Add Like
    await comment.save();
    return res.json({
        success: `Liked comment`,
        likeCount: comment.likes.length
    });
}
// DELETE: delete announcement 
controller.deleteAnnouncement = async function(req, res) {
    const announcement = await Announcement.findById(req.params.id).populate('sender');
    if (!announcement) {
        req.flash('error', "Unable to access announcement");
        return res.redirect('back');
    }
    // check if user is announcement author
    if(!(await announcement.sender.equals(req.user._id))) { 
        req.flash('error', "You can only delete announcements that you have posted");
        return res.redirect('back');
    }
    
    // delete any uploads
    let cloudErr;
    let cloudResult;
    for (let file of announcement.mediaFiles) {
        if (file && file.filename) {
            // Evaluate deleted files' filetype and delete accordingly
            switch(path.extname(await file.url.split("SaberChat/")[1]).toLowerCase()) {
                case ".mp3":
                case ".mp4":
                case ".m4a":
                case ".mov":
                    [cloudErr, cloudResult] = await cloudDelete(file.filename, "video");
                    break;
                case ".pdf":
                    [cloudErr, cloudResult] = await cloudDelete(file.filename, "pdf");
                    break;
                default:
                    [cloudErr, cloudResult] = await cloudDelete(file.filename, "image");
            }

            // check for failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
        }
    }

    const deletedAnnouncement = await Announcement.findByIdAndDelete(announcement._id);
    if (!deletedAnnouncement) {
        req.flash('error', "Unable to delete announcement");
        return res.redirect('back');
    }

    const users = await User.find({authenticated: true});
    if (!users) {
        req.flash('error', "Unable to find users");
        return res.redirect('back');
    }

    // remove announcement from user ann inboxes
    for (let user of users) {
        if (objectArrIndex(user.annCount, "announcement", deletedAnnouncement._id) > -1) {
            await user.annCount.splice(objectArrIndex(user.annCount, "announcement", deletedAnnouncement._id), 1);
            await user.save();
        }
    }

    req.flash('success', 'Announcement Deleted!');
    return res.redirect('/announcements');
}

module.exports = controller; // export controller object