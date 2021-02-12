const { sendGridEmail } = require("../utils/transport");
const convertToLink = require("../utils/convert-to-link");

const {singleUpload, multipleUpload} = require('../middleware/multer');
const {cloudUpload, cloudDelete} = require('../services/cloudinary');
const {validateAnn} = require('../middleware/validation');

//SCHEMA
const User = require('../models/user');
const Announcement = require('../models/announcement');
const Notification = require('../models/message');
const PostComment = require('../models/postComment');

// Ann GET index
module.exports.index = async function(req, res) {
    const Anns = await Announcement.find({}).populate('sender').exec();
    if(!Anns) {req.flash('error', 'Cannot find announcements.'); return res.redirect('back');}
    res.render('announcements/index', {announcements: Anns.reverse()});
};

// Ann GET new ann
module.exports.new = function(req, res) {
    res.render('announcements/new');
};

// Ann GET markall ann as read
module.exports.markAll = function(req, res) {
    req.user.annCount = []; //No new announcements in user's annCount
    req.user.save();
    req.flash('success', 'All Announcements Marked As Read!');
    res.redirect(`/announcements`);
};

// Ann GET mark one ann as read
module.exports.markOne = function(req, res) {
    //Iterate through user's announcement count and find the announcement that is being marked as read
    let index = -1;
    for (let i = 0; i < req.user.annCount.length; i++) {
        if (req.user.annCount[i].announcement.toString() == req.params.id.toString()) {
            index = i;
        }
    }
    //If the announcement exists, remove it from announcement count
    if (index > -1) {
        req.user.annCount.splice(index, 1);
        req.user.save()
    }

    req.flash('success', 'Announcement Marked As Read!');
    res.redirect(`/announcements`);
};

// Ann GET show
module.exports.show = async function(req, res) {
    const Ann = await Announcement.findById(req.params.id)
        .populate('sender')
        .populate({
            path: "comments",
            populate: {
                path: "sender"
            }
        }).exec();
    if(!Ann) {req.flash('error', 'Could not find announcement'); return res.redirect('back');}

    if(req.user) {
        let index = -1;
        for (let i = 0; i < req.user.annCount.length; i ++) {
            if (req.user.annCount[i].announcement._id.equals(Ann._id)) {
                index = i;
            }
        }

        if (index > -1) {
            req.user.annCount.splice(index, 1);
        }
        await req.user.save();
    }

    const convertedText = convertToLink(Ann.text);
    res.render('announcements/show', {
        announcement: foundAnn,
        convertedText
    });
};

// Ann GET edit form
module.exports.updateForm = async function(req, res) {
    const Ann = await Announcement.findById(req.params.id);
    if(!Ann) {req.flash('error', 'Could not find announcement'); return res.redirect('back');}

    if(!Ann.sender._id.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that.');
        return res.redirect('back');
    }

    res.render('announcements/edit', { announcement: Ann });
};

// Ann POST create
module.exports.create = async function(req, res) {
    let announcementObject = {
        announcement: announcement,
        version: "new"
    };

    for (let user of users) {
        transport(user, `New Saberchat Announcement - ${announcement.subject}`, `<p>Hello ${user.firstName},</p><p>${req.user.username} has recently posted a new announcement - '${announcement.subject}'.</p><p>${announcement.text}</p><p>You can access the full announcement at https://alsion-saberchat.herokuapp.com</p> ${imageString}`);
        user.annCount.push(announcementObject);
        await user.save();
    }

    req.flash('success', 'Announcement posted to bulletin!');
    res.redirect(`/announcements/${announcement._id}`);

    const Ann = await Announcement.create({
        sender: req.user,
        subject: req.body.subject,
        text: req.body.message
    });

    if (!Ann) {
        req.flash('error', 'Unable to create announcement');
        return res.redirect('back');
    }

    if (req.body.images) { //If any images were added (if not, the 'images' property is null)
        for (const image in req.body.images) {
            Ann.images.push(req.body.images[image]);
        }
    }

    // if files were uploaded
    if (req.files) {
        let cloudErr;
        let cloudResult;
        for (let file of req.files) {
            if (path.extname(file.originalname).toLowerCase() == ".mp4") {
                [cloudErr, cloudResult] = await cloudUpload(file, "video");
            } else {
                [cloudErr, cloudResult] = await cloudUpload(file, "image");
            }
            if (cloudErr || !cloudResult) {
                req.flash('error', 'Upload failed');
                return res.redirect('back');
            }

            Ann.imageFiles.push({
                filename: cloudResult.public_id,
                url: cloudResult.secure_url
            });
        }
    }

    Ann.date = dateFormat(Ann.created_at, "h:MM TT | mmm d");
    await Ann.save();

    const Users = await User.find({
        authenticated: true,
        _id: {
            $ne: req.user._id
        }
    });

    let imageString = "";

    for (const image of Ann.images) {
        imageString += `<img src="${image}">`;
    }

    if (!Users) {
        req.flash('error', "An Error Occurred");
        res.rediect('back');
    }

    let announcementObject = {
        announcement: announcement,
        version: "new"
    };

    for (let user of Users) {
        if (!user.receiving_emails) {
            continue
        }
        const emailText = `<p>Hello ${user.firstName},</p><p>${req.user.username} has recently posted a new announcement - '${Ann.subject}'.</p><p>${Ann.text}</p><p>You can access the full announcement at https://alsion-saberchat.herokuapp.com</p> ${imageString}`;

        await sendGridEmail(user.email, `New Saberchat Announcement - ${Ann.subject}`, emailText);
        user.annCount.push(announcementObject);
        await user.save();
    }

    req.flash('success', 'Announcement posted to bulletin!');
    res.redirect(`/announcements/${Ann._id}`);
};

// Ann PUT like ann
module.exports.likeAnn = async function(req, res) {
    const Ann = await Announcement.findById(req.body.announcement);
    if(!Ann) {return res.json({error: 'Error updating announcement.'});}

    if (Ann.likes.includes(req.user._id)) { //Remove like
        Ann.likes.splice(Ann.likes.indexOf(req.user._id), 1);
        await Ann.save();

        res.json({
            success: `Removed a like from ${Ann.subject}`,
            likeCount: Ann.likes.length
        });
    } else {
        Ann.likes.push(req.user._id);
        await Ann.save();

        res.json({
            success: `Liked ${Ann.subject}`,
            likeCount: Ann.likes.length
        });
    }
};

// Ann PUT like comment
module.exports.likeComment = async function(req, res) {
    const postComment = await PostComment.findById(req.body.commentId);
    if(!comment) {return res.json({error: 'Error finding comment'});}

    if (postComment.likes.includes(req.user._id)) { //Remove Like
        postComment.likes.splice(postComment.likes.indexOf(req.user._id), 1);
        await postComment.save();
        res.json({
            success: `Removed like`,
            likeCount: postComment.likes.length
        });

    } else { //Add Like
        postComment.likes.push(req.user._id);
        postComment.save();

        res.json({
            success: `Liked comment`,
            likeCount: postComment.likes.length
        });
    }
};
