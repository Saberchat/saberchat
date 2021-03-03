const {sendGridEmail} = require("../services/sendGrid");
const convertToLink = require("../utils/convert-to-link");
const {objectArrIncludes} = require("../utils/object-operations");

const path = require('path');
const dateFormat = require('dateformat');
const {cloudUpload, cloudDelete} = require('../services/cloudinary');

//SCHEMA
const User = require('../models/user');
const Announcement = require('../models/announcements/announcement');
const Notification = require('../models/inbox/message');
const PostComment = require('../models/postComment');

const controller = {};

// Ann GET index
controller.index = async function(req, res) {
    const announcements = await Announcement.find({}).populate('sender').exec();
    if(!announcements) {req.flash('error', 'Cannot find announcements.'); return res.redirect('back');}
    return res.render('announcements/index', {announcements: announcements.reverse()});
};

// Ann GET new ann
controller.new = function(req, res) {
    return res.render('announcements/new');
};

// Ann GET markall ann as read
controller.markAll = function(req, res) {
    req.user.annCount = []; //No new announcements in user's annCount
    req.user.save();
    req.flash('success', 'All Announcements Marked As Read!');
    return res.redirect(`/announcements`);
};

// Ann GET mark one ann as read
controller.markOne = function(req, res) {
    if (objectArrIncludes(req.user.annCount, "announcement", req.params.id) > -1) {
        req.user.annCount.splice(objectArrIncludes(req.user.annCount, "announcement", req.params.id), 1);
        req.user.save();
    }
    req.flash('success', 'Announcement Marked As Read!');
    return res.redirect(`/announcements`);
};

// Ann GET show
controller.show = async function(req, res) {
    const announcement = await Announcement.findById(req.params.id)
        .populate('sender')
        .populate({
            path: "comments",
            populate: {
                path: "sender"
            }
        }).exec();
    if(!announcement) {req.flash('error', 'Could not find announcement'); return res.redirect('back');}

    if(req.user) {
        if (objectArrIncludes(req.user.annCount, "announcement", announcement._id, "_id") > -1) {
            req.user.annCount.splice(objectArrIncludes(req.user.annCount, "announcement", announcement._id, "_id"), 1);
            await req.user.save();
        }
    }

    let fileExtensions = new Map();
    for (let media of announcement.imageFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    const convertedText = convertToLink(announcement.text);
    return res.render('announcements/show', {announcement, convertedText, fileExtensions});
};

// Ann GET edit form
controller.updateForm = async function(req, res) {
    const announcement = await Announcement.findById(req.params.id);
    if(!announcement) {req.flash('error', 'Could not find announcement'); return res.redirect('back');}
    if(!announcement.sender._id.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that.');
        return res.redirect('back');
    }

    let fileExtensions = new Map();
    for (let media of announcement.imageFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    return res.render('announcements/edit', { announcement, fileExtensions });
};

// Ann POST create
controller.create = async function(req, res) {
    const announcement = await Announcement.create({
        sender: req.user,
        subject: req.body.subject,
        text: req.body.message
    });
    if (!announcement) {
        req.flash('error', 'Unable to create announcement');
        return res.redirect('back');
    }

    if (req.body.images) { //If any images were added (if not, the 'images' property is null)
        for (const image in req.body.images) {
            announcement.images.push(req.body.images[image]);
        }
    }

    // if files were uploaded
    if (req.files) {
        if (req.files.imageFile) {
            let cloudErr;
            let cloudResult;
            for (let file of req.files.imageFile) {
                if ([".mp3", ".mp4", ".m4a", ".mov"].includes(path.extname(file.originalname).toLowerCase())) {
                    [cloudErr, cloudResult] = await cloudUpload(file, "video");
                } else if (path.extname(file.originalname).toLowerCase() == ".pdf") {
                    [cloudErr, cloudResult] = await cloudUpload(file, "pdf");
                } else {
                    [cloudErr, cloudResult] = await cloudUpload(file, "image");
                }
                if (cloudErr || !cloudResult) {
                    req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }

                announcement.imageFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }

    announcement.date = dateFormat(announcement.created_at, "h:MM TT | mmm d");
    await announcement.save();

    const Users = await User.find({
        authenticated: true,
        _id: {$ne: req.user._id}
    });
    if (!Users) {
        req.flash('error', "An Error Occurred");
        return res.rediect('back');
    }

    let imageString = "";
    for (const image of announcement.images) {
        imageString += `<img src="${image}">`;
    }

    for (let user of Users) {
        if (user.receiving_emails) {
            const emailText = `<p>Hello ${user.firstName},</p><p>${req.user.username} has recently posted a new announcement - '${announcement.subject}'.</p><p>${announcement.text}</p><p>You can access the full announcement at https://alsion-saberchat.herokuapp.com</p> ${imageString}`;
            await sendGridEmail(user.email, `New Saberchat Announcement - ${announcement.subject}`, emailText, false);
            user.annCount.push({announcement, version: "new"});
            await user.save();
        }
    }

    req.flash('success', 'Announcement posted to bulletin!');
    return res.redirect(`/announcements/${announcement._id}`);
};

controller.updateAnn = async function(req, res) {
    const announcement = await Announcement.findById(req.params.id).populate('sender');
    if (!announcement) {
        req.flash('error', "Unable to access announcement");
        return res.redirect('back');
    }

    if (announcement.sender._id.toString() != req.user._id.toString()) {
        req.flash('error', "You can only update announcements which you have sent");
        return res.redirect('back');
    }

    const updatedAnn = await Announcement.findByIdAndUpdate(req.params.id, {
        subject: req.body.subject,
        text: req.body.message
    });
    if (!updatedAnn) {
        req.flash('error', "Unable to update announcement");
        return res.redirect('back');
    }

    updatedAnn.images = []; //Empty image array so that you can fill it with whatever images are added (all images are there, not just new ones)
    if (req.body.images) { //Only add images if any are provided
        for (const image in req.body.images) {
            updatedAnn.images.push(req.body.images[image]);
        }
    }

    let cloudErr;
    let cloudResult;
    for (let i = updatedAnn.imageFiles.length-1; i >= 0; i--) {
        if (req.body[`deleteUpload-${updatedAnn.imageFiles[i].url}`] && updatedAnn.imageFiles[i] && updatedAnn.imageFiles[i].filename) {
            if ([".mp3", ".mp4", ".m4a", ".mov"].includes(path.extname(updatedAnn.imageFiles[i].url.split("SaberChat/")[1]).toLowerCase())) {
                [cloudErr, cloudResult] = await cloudDelete(updatedAnn.imageFiles[i].filename, "video");
            } else if (path.extname(updatedAnn.imageFiles[i].url.split("SaberChat/")[1]).toLowerCase() == ".pdf") {
                [cloudErr, cloudResult] = await cloudDelete(updatedAnn.imageFiles[i].filename, "pdf");
            } else {
                [cloudErr, cloudResult] = await cloudDelete(updatedAnn.imageFiles[i].filename, "image");
            }
            // check for failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
            updatedAnn.imageFiles.splice(i, 1);
        }
    }

    // if files were uploaded
    if (req.files) {
        if (req.files.imageFile) {
            for (let file of req.files.imageFile) {
                if ([".mp3", ".mp4", ".m4a", ".mov"].includes(path.extname(file.originalname).toLowerCase())) {
                    [cloudErr, cloudResult] = await cloudUpload(file, "video");
                } else if (path.extname(file.originalname).toLowerCase() == ".pdf") {
                    [cloudErr, cloudResult] = await cloudUpload(file, "pdf");
                } else {
                    [cloudErr, cloudResult] = await cloudUpload(file, "image");
                }
                if (cloudErr || !cloudResult) {
                    req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }

                updatedAnn.imageFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }

    await updatedAnn.save();
    const users = await User.find({authenticated: true, _id: {$ne: req.user._id}});
    if (!users) {
        req.flash('error', "An Error Occurred");
        return res.rediect('back');
    }

    let imageString = "";
    for (let image of announcement.images) {
        imageString += `<img src="${image}">`;
    }

    for (let user of users) {
        if (user.receiving_emails) {
            await sendGridEmail(user.email, `Updated Saberchat Announcement - ${announcement.subject}`, `<p>Hello ${user.firstName},</p><p>${req.user.username} has recently updated an announcement - '${announcement.subject}'.</p><p>${announcement.text}</p><p>You can access the full announcement at https://alsion-saberchat.herokuapp.com</p> ${imageString}`, false);
        }

        //If announcement not already in user's anncount, add it
        if (objectArrIncludes(user.annCount, "announcement", updatedAnn._id) == -1) {
            user.annCount.push({announcement: updatedAnn, version: "updated"});
            await user.save();
        }
    }

    req.flash('success', 'Announcement Updated!');
    return res.redirect(`/announcements/${updatedAnn._id}`);
}

// Ann PUT like ann
controller.likeAnn = async function(req, res) {
    const announcement = await Announcement.findById(req.body.announcement);
    if(!announcement) {return res.json({error: 'Error updating announcement.'});}

    if (announcement.likes.includes(req.user._id)) { //Remove like
        announcement.likes.splice(announcement.likes.indexOf(req.user._id), 1);
        await announcement.save();

        return res.json({
            success: `Removed a like from ${announcement.subject}`,
            likeCount: announcement.likes.length
        });
    } else {
        announcement.likes.push(req.user._id);
        await announcement.save();

        return res.json({
            success: `Liked ${announcement.subject}`,
            likeCount: announcement.likes.length
        });
    }
};

// Ann PUT comment
controller.comment = async function(req, res) {
    const announcement = await Announcement.findById(req.body.announcement)
        .populate({
            path: "comments",
            populate: {
                path: "sender"
            }
        });
    if (!announcement) {
        return res.json({
            error: 'Error commenting'
        });
    }

    const comment = await PostComment.create({
        type: "comment",
        text: req.body.text,
        sender: req.user
    });
    if (!comment) {
        return res.json({error: 'Error commenting'});
    }

    comment.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
    await comment.save();

    announcement.comments.push(comment);
    await announcement.save();

    let users = [];
    let user;
    for (let line of comment.text.split(" ")) {
        if (line[0] == '@') {
            user = await User.findById(line.split("#")[1].split("_")[0]);

            if (!user) {
                return res.json({
                    error: "Error accessing user"
                });
            }
            users.push(user);
        }
    }

    let notif;
    for (let user of users) {
        notif = await Notification.create({
            subject: `New Mention in ${announcement.subject}`,
            sender: req.user,
            noReply: true,
            recipients: [user],
            read: [],
            toEveryone: false,
            images: []
        });
        if (!notif) {
            return res.json({error: "Error creating notification"});
        }

        notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
        notif.text = `Hello ${user.firstName},\n\n${req.user.firstName} ${req.user.lastName} mentioned you in a comment on "${announcement.subject}":\n${comment.text}`;
        await notif.save();

        if (user.receiving_emails) {
            await sendGridEmail(user.email, `New Mention in ${announcement.subject}`, `<p>Hello ${user.firstName},</p><p>${req.user.firstName} ${req.user.lastName} mentioned you in a comment on <strong>${announcement.subject}</strong>.<p>${comment.text}</p>`, false);
        }

        user.inbox.push(notif); //Add notif to user's inbox
        user.msgCount += 1;
        await user.save();
    }

    return res.json({
        success: 'Successful comment',
        comments: announcement.comments
    });
}

// Ann PUT like comment
controller.likeComment = async function(req, res) {
    const comment = await PostComment.findById(req.body.commentId);
    if(!comment) {return res.json({error: 'Error finding comment'});}

    if (comment.likes.includes(req.user._id)) { //Remove Like
        comment.likes.splice(comment.likes.indexOf(req.user._id), 1);
        await comment.save();
        return res.json({
            success: `Removed a like`,
            likeCount: comment.likes.length
        });

    } else { //Add Like
        comment.likes.push(req.user._id);
        comment.save();

        return res.json({
            success: `Liked comment`,
            likeCount: comment.likes.length
        });
    }
}

controller.deleteAnn = async function(req, res) {
    const announcement = await Announcement.findById(req.params.id).populate('sender');
    if (!announcement) {
        req.flash('error', "Unable to access announcement");
        return res.redirect('back');
    }

    if (announcement.sender._id.toString() != req.user._id.toString()) {
        req.flash('error', "You can only delete announcements that you have posted");
        return res.redirect('back');

    }
    // delete any uploads
    let cloudErr;
    let cloudResult;
    for (let file of announcement.imageFiles) {
        if (file && file.filename) {
            if ([".mp3", ".mp4", ".m4a", ".mov"].includes(path.extname(file.url.split("SaberChat/")[1]).toLowerCase())) {
                [cloudErr, cloudResult] = await cloudDelete(file.filename, "video");
            } else if (path.extname(file.url.split("SaberChat/")[1]).toLowerCase() == ".pdf") {
                [cloudErr, cloudResult] = await cloudDelete(file.filename, "pdf");
            } else {
                [cloudErr, cloudResult] = await cloudDelete(file.filename, "image");
            }
            // check for failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
        }
    }

    const deletedAnn = await Announcement.findByIdAndDelete(announcement._id);
    if (!deletedAnn) {
        req.flash('error', "Unable to delete announcement");
        return res.redirect('back');
    }

    const users = await User.find({authenticated: true});
    if (!users) {
        req.flash('error', "Unable to find users");
        return res.redirect('back');
    }

    for (let user of users) {
        if (objectArrIncludes(user.annCount, "announcement", deletedAnn._id) > -1) {
            user.annCount.splice(objectArrIncludes(user.annCount, "announcement", deletedAnn._id), 1);
            await user.save();
        }
    }

    req.flash('success', 'Announcement Deleted!');
    return res.redirect('/announcements/');
}

module.exports = controller;