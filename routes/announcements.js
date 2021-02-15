//Announcement routes dictate the posting, viewing, and editing of the Saberchat Announcement Bulletin

//LIBRARIES
const express = require('express');
const middleware = require('../middleware/index');
const router = express.Router(); //start express router
const dateFormat = require('dateformat');
const path = require('path');
const {transport} = require("../utils/transport");
const convertToLink = require("../utils/convert-to-link");

const {multipleUpload} = require('../middleware/multer');
const {cloudUpload, cloudDelete} = require('../services/cloudinary');
const {validateAnn} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');

//SCHEMA
const User = require('../models/user');
// const Announcement = require('../models/announcement');
const Notification = require('../models/message');
const PostComment = require('../models/postComment');
const Ann = require('../models/announcement');

// Controller
const Announcement = require('../controllers/announcements');

//ROUTES
router.route('/')
    .get(wrapAsync(Announcement.index))
    .post(middleware.isLoggedIn, middleware.isMod, multipleUpload, validateAnn, wrapAsync(Announcement.create));

router.get('/new', middleware.isLoggedIn, middleware.isMod, Announcement.new);

router.get('/mark-all', middleware.isLoggedIn, Announcement.markAll);

router.get('/mark/:id', middleware.isLoggedIn, Announcement.markOne);

router.get('/:id', wrapAsync(Announcement.show));

router.get('/:id/edit', middleware.isLoggedIn, middleware.isMod, wrapAsync(Announcement.updateForm));

router.put('/like', middleware.isLoggedIn, wrapAsync(Announcement.likeAnn));

router.put('/like-comment', middleware.isLoggedIn, wrapAsync(Announcement.likeComment));

router.put('/comment', middleware.isLoggedIn, (req, res) => {

    (async () => {

        const announcement = await Ann.findById(req.body.announcement)
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
            text: req.body.text,
            sender: req.user
        });
        if (!comment) {
            return res.json({
                error: 'Error commenting'
            });
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
            }); //Create a notification to alert the user

            if (!notif) {
                return res.json({
                    error: "Error creating notification"
                });
            }

            notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
            notif.text = `Hello ${user.firstName},\n\n${req.user.firstName} ${req.user.lastName} mentioned you in a comment on "${announcement.subject}":\n${comment.text}`;
            await notif.save();

            transport(user, `New Mention in ${announcement.subject}`, `<p>Hello ${user.firstName},</p><p>${req.user.firstName} ${req.user.lastName} mentioned you in a comment on <strong>${announcement.subject}</strong>.<p>${comment.text}</p>`);
            user.inbox.push(notif); //Add notif to user's inbox
            user.msgCount += 1;
            await user.save();
        }

        res.json({
            success: 'Successful comment',
            comments: announcement.comments
        });

    })().catch(err => {
        res.json({
            error: 'Error Commenting'
        });
    })

})

router.put('/:id', middleware.isLoggedIn, middleware.isMod, multipleUpload, (req, res) => { //RESTful Routing 'UPDATE' route
    (async () => {
        const announcement = await Ann.findById(req.params.id).populate('sender');
        if (!announcement) {
            req.flash('error', "Unable to access announcement");
            return res.redirect('back');
        }

        if (announcement.sender._id.toString() != req.user._id.toString()) {
            req.flash('error', "You can only update announcements which you have sent");
            return res.redirect('back');
        }

        const updatedAnnouncement = await Ann.findByIdAndUpdate(req.params.id, {
            subject: req.body.subject,
            text: req.body.message
        });
        if (!updatedAnnouncement) {
            req.flash('error', "Unable to update announcement");
            return res.redirect('back');
        }

        updatedAnnouncement.images = []; //Empty image array so that you can fill it with whatever images are added (all images are there, not just new ones)
        if (req.body.images) { //Only add images if any are provided
            for (const image in req.body.images) {
                updatedAnnouncement.images.push(req.body.images[image]);
            }
        }

        let cloudErr;
        let cloudResult;
        for (let i = updatedAnnouncement.imageFiles.length-1; i >= 0; i--) {
            if (req.body[`deleteUpload-${updatedAnnouncement.imageFiles[i].url}`] && updatedAnnouncement.imageFiles[i] && updatedAnnouncement.imageFiles[i].filename) {
                if ([".mp3", ".mp4", ".m4a"].includes(path.extname(updatedAnnouncement.imageFiles[i].url.split("SaberChat/")[1]).toLowerCase())) {
                    [cloudErr, cloudResult] = await cloudDelete(updatedAnnouncement.imageFiles[i].filename, "video");
                } else if (path.extname(updatedAnnouncement.imageFiles[i].url.split("SaberChat/")[1]).toLowerCase() == ".pdf") {
                    [cloudErr, cloudResult] = await cloudDelete(updatedAnnouncement.imageFiles[i].filename, "pdf");
                } else {
                    [cloudErr, cloudResult] = await cloudDelete(updatedAnnouncement.imageFiles[i].filename, "image");
                }
                // check for failure
                if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                    req.flash('error', 'Error deleting uploaded image');
                    return res.redirect('back');
                }
                updatedAnnouncement.imageFiles.splice(i, 1);
            }
        }

        // if files were uploaded
        if (req.files) {
            if (req.files.imageFile) {
                for (let file of req.files.imageFile) {
                    if ([".mp3", ".mp4", ".m4a"].includes(path.extname(file.originalname).toLowerCase())) {
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

                    updatedAnnouncement.imageFiles.push({
                        filename: cloudResult.public_id,
                        url: cloudResult.secure_url,
                        originalName: file.originalname
                    });
                }
            }
        }

        await updatedAnnouncement.save();
        const users = await User.find({
            authenticated: true,
            _id: {
                $ne: req.user._id
            }
        });

        let announcementEmail;

        let imageString = "";

        for (let image of announcement.images) {
            imageString += `<img src="${image}">`;
        }

        if (!users) {
            req.flash('error', "An Error Occurred");
            return res.rediect('back');
        }

        let announcementObject = {
            announcement: updatedAnnouncement,
            version: "updated"
        };

        let overlap;

        for (let user of users) {
            transport(user, `Updated Saberchat Announcement - ${announcement.subject}`, `<p>Hello ${user.firstName},</p><p>${req.user.username} has recently updated an announcement - '${announcement.subject}'.</p><p>${announcement.text}</p><p>You can access the full announcement at https://alsion-saberchat.herokuapp.com</p> ${imageString}`);
            overlap = false;

            for (let a of user.annCount) {
                if (a.announcement.toString() == updatedAnnouncement._id.toString()) {
                    overlap = true;
                    break;
                }
            }

            if (!overlap) {
                user.annCount.push(announcementObject);
                await user.save();
            }
        }

        req.flash('success', 'Announcement Updated!');
        res.redirect(`/announcements/${updatedAnnouncement._id}`);

    })().catch(err => {
        req.flash('error', "An Error Occurred");
        res.redirect('back');
    });
});

router.delete('/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => { // RESTful Routing 'DESTROY' route
    (async () => {

        const announcement = await Ann.findById(req.params.id).populate('sender');
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
                if ([".mp3", ".mp4", ".m4a"].includes(path.extname(file.url.split("SaberChat/")[1]).toLowerCase())) {
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

        const deletedAnn = await Ann.findByIdAndDelete(announcement._id);

        if (!deletedAnn) {
            req.flash('error', "Unable to delete announcement");
            return res.redirect('back');
        }

        const users = await User.find({
            authenticated: true
        });
        if (!users) {
            req.flash('error', "Unable to find users");
            return res.redirect('back');
        }

        for (let user of users) {
            let index;

            for (let i = 0; i < user.annCount.length; i += 1) {
                if (user.annCount[i].announcement.toString() == deletedAnn._id.toString()) {
                    index = i;
                }
            }

            if (index > -1) {
                user.annCount.splice(index, 1);
                await user.save();
            }
        }

        req.flash('success', 'Announcement Deleted!');
        res.redirect('/announcements/');

    })().catch(err => {
        req.flash('error', "An Error Occurred");
        res.redirect('back');
    });
});

module.exports = router; //Export these routes to app.js
