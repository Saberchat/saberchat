//LIBRARIES
const {convertToLink} = require("../utils/convert-to-link");
const dateFormat = require('dateformat');
const path = require('path');
const {objectArrIndex, removeIfIncluded} = require("../utils/object-operations");
const setup = require("../utils/setup");
const {cloudUpload, cloudDelete} = require('../services/cloudinary');

//SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const {Event, PostComment} = require('../models/post');

const controller = {};

// Event GET index
controller.index = async function(req, res) {
    const platform = await setup(Platform);
    let events;
    if (req.user && platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission)) {
        events = await Event.find({}).populate('sender');
    } else {
        events = await Event.find({verified: true}).populate('sender');
    }
    if(!platform || !events) {req.flash('error', 'Cannot find events.'); return res.redirect('back');}

    let current = [];
    let past = [];
    let date;
    for (let event of events) {
        date = new Date(parseInt(event.deadline.year), parseInt(event.deadline.month)-1, parseInt(event.deadline.day));
        if (date.getTime > new Date().getTime()) {
            past.push(event);
        } else {
            current.push(event);
        }
    }

    if (req.query.past) {
        return res.render('events/index', {platform, events: past.reverse(), activeSearch: false, icon: platform.features[objectArrIndex(platform.features, "route", "events")].icon});   
    }
    return res.render('events/index', {platform, events: current.reverse(), activeSearch: true, icon: platform.features[objectArrIndex(platform.features, "route", "events")].icon});
};

// Event GET new event
controller.new = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    return res.render('events/new', {platform, icon: platform.features[objectArrIndex(platform.features, "route", "events")].icon});
};

// Event GET show
controller.show = async function(req, res) {
    const platform = await setup(Platform);
    const event = await Event.findById(req.params.id)
        .populate('sender')
        .populate({
            path: "comments",
            populate: {path: "sender"}
        });
    if(!platform || !event) {
        req.flash('error', 'Could not find event'); return res.redirect('back');
    } else if (!event.verified && !platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission)) {
        req.flash('error', 'You cannot view that event');
        return res.redirect('back');
    }

    let date = new Date(parseInt(event.deadline.year), parseInt(event.deadline.month)-1, parseInt(event.deadline.day));
    let version = (date.getTime < new Date().getTime());

    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of event.mediaFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    const convertedText = convertToLink(event.text); //Parse and add hrefs to all links in text
    return res.render('events/show', {platform, event, convertedText, fileExtensions, version, icon: platform.features[objectArrIndex(platform.features, "route", "events")].icon});
};

// Event GET edit form
controller.updateForm = async function(req, res) {
    const platform = await setup(Platform);
    const event = await Event.findById(req.params.id);
    if(!platform || !event) {req.flash('error', 'Could not find event'); return res.redirect('back');}
    if(!event.sender._id.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that.');
        return res.redirect('back');
    }

    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of event.mediaFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    return res.render('events/edit', {platform, event, fileExtensions, icon: platform.features[objectArrIndex(platform.features, "route", "events")].icon});
};

// Event POST create
controller.create = async function(req, res) {
    const event = await Event.create({ //Build event with error info
        sender: req.user,
        subject: req.body.subject,
        text: req.body.message,
        deadline: {
            day: req.body.day,
            month: req.body.month,
            year: req.body.year
        }
    });
    if (!event) {
        req.flash('error', 'Unable to create event');
        return res.redirect('back');
    }

    for (let attr of ["images", "links"]) { //Add images and links
        if (req.body[attr]) {
            event[attr] = req.body[attr];
        }
    }

    // if files were uploaded, process them
    if (req.files) {
        if (req.files.mediaFile) {
            let cloudErr;
            let cloudResult;
            for (let file of req.files.mediaFile) { //Upload each file to cloudinary
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

                event.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }

    event.date = dateFormat(event.created_at, "h:MM TT | mmm d");
    await event.save();

    req.flash('success', 'Event Posted to Bulletin!');
    return res.redirect(`/events/${event._id}`);
};

controller.verify = async function(req, res) {
    const event = await Event.findByIdAndUpdate(req.params.id, {verified: true});
    if (!event) {
        req.flash('error', "Unable to access event");
        return res.redirect('back');
    }

    req.flash("success", "Verified Event!");
    return res.redirect("/events");
}

controller.updateEvent = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "Unable to setup platform");
        return res.redirect("back");
    } 
    const event = await Event.findById(req.params.id).populate('sender');
    if (!event) {
        req.flash('error', "Unable to access event");
        return res.redirect('back');
    }

    if (event.sender._id.toString() != req.user._id.toString()) {
        req.flash('error', "You can only update events which you have sent");
        return res.redirect('back');
    }

    const updatedEvent = await Event.findByIdAndUpdate(req.params.id, {
        subject: req.body.subject,
        text: req.body.message,
        verified: false,
        deadline: {
            day: req.body.day,
            month: req.body.month,
            year: req.body.year
        }
    });
    if (!updatedEvent) {
        req.flash('error', "Unable to update event");
        return res.redirect('back');
    }

    for (let attr of ["images", "links"]) { //Add images and links
        if (req.body[attr]) {
            updatedEvent[attr] = req.body[attr];
        }
    }
    if (!platform.postVerifiable) {updatedEvent.verified = true;} //Event does not need to be verified if platform does not support verifying events

    //Iterate through all selected media to remove and delete them
    let cloudErr;
    let cloudResult;
    for (let i = updatedEvent.mediaFiles.length-1; i >= 0; i--) {
        if (req.body[`deleteUpload-${updatedEvent.mediaFiles[i].url}`] && updatedEvent.mediaFiles[i] && updatedEvent.mediaFiles[i].filename) {
            if ([".mp3", ".mp4", ".m4a", ".mov"].includes(path.extname(updatedEvent.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase())) {
                [cloudErr, cloudResult] = await cloudDelete(updatedEvent.mediaFiles[i].filename, "video");
            } else if (path.extname(updatedEvent.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase() == ".pdf") {
                [cloudErr, cloudResult] = await cloudDelete(updatedEvent.mediaFiles[i].filename, "pdf");
            } else {
                [cloudErr, cloudResult] = await cloudDelete(updatedEvent.mediaFiles[i].filename, "image");
            }
            // check for failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
            updatedEvent.mediaFiles.splice(i, 1);
        }
    }

    // if files were uploaded
    if (req.files) {
        if (req.files.mediaFile) {
            //Iterate through all new attached media
            for (let file of req.files.mediaFile) {
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

                updatedEvent.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }
    
    await updatedEvent.save();
    req.flash('success', 'Event Updated!');
    return res.redirect(`/events/${updatedEvent._id}`);
}

// Event PUT like event
controller.likeEvent = async function(req, res) {
    const event = await Event.findById(req.body.eventId);
    if(!event) {return res.json({error: 'Error updating event.'});}

    if (removeIfIncluded(event.likes, req.user._id)) { //Remove like
        await event.save();
        return res.json({
            success: `Removed a like from ${event.subject}`,
            likeCount: event.likes.length
        });
    }

    event.likes.push(req.user._id); //Add likes to event
    await event.save();
    return res.json({
        success: `Liked ${event.subject}`,
        likeCount: event.likes.length
    });
};

// Event PUT comment
controller.comment = async function(req, res) {
    const event = await Event.findById(req.body.eventId)
        .populate({
            path: "comments",
            populate: {path: "sender"}
        });
    if (!event) {
        return res.json({
            error: 'Error commenting'
        });
    }

    const comment = await PostComment.create({
        text: req.body.text.split('<').join('&lt'),
        sender: req.user
    });
    if (!comment) {
        return res.json({error: 'Error commenting'});
    }

    comment.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
    await comment.save();

    event.comments.push(comment);
    await event.save();

    let users = [];
    let user;
    //Search for any mentioned users
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

    return res.json({
        success: 'Successful comment',
        comments: event.comments
    });
}

// Event PUT like comment
controller.likeComment = async function(req, res) {
    const comment = await PostComment.findById(req.body.commentId);
    if(!comment) {return res.json({error: 'Error finding comment'});}

    if (removeIfIncluded(comment.likes, req.user._id)) { //Remove Like
        await comment.save();
        return res.json({
            success: `Removed a like`,
            likeCount: comment.likes.length
        });
    }

    comment.likes.push(req.user._id); //Add Like
    await comment.save();
    return res.json({
        success: `Liked comment`,
        likeCount: comment.likes.length
    });
}

controller.deleteEvent = async function(req, res) {
    const event = await Event.findById(req.params.id).populate('sender');
    if (!event) {
        req.flash('error', "Unable to access event");
        return res.redirect('back');
    }

    if (event.sender._id.toString() != req.user._id.toString()) { //Doublecheck that deleter is eventer
        req.flash('error', "You can only delete events that you have posted");
        return res.redirect('back');
    }

    // delete any uploads
    let cloudErr;
    let cloudResult;
    for (let file of event.mediaFiles) {
        if (file && file.filename) {
            if ([".mp3", ".mp4", ".m4a", ".mov"].includes(path.extname(file.url.split("SaberChat/")[1]).toLowerCase())) {
                [cloudErr, cloudResult] = await cloudDelete(file.filename, "video");
            } else if (path.extname(file.url.split("SaberChat/")[1]).toLowerCase() == ".pdf") {
                [cloudErr, cloudResult] = await cloudDelete(file.filename, "pdf");
            } else {
            }
                [cloudErr, cloudResult] = await cloudDelete(file.filename, "image");
            // check for failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
        }
    }

    const deletedEvent = await Event.findByIdAndDelete(event._id);
    if (!deletedEvent) {
        req.flash('error', "Unable to delete event");
        return res.redirect('back');
    }

    req.flash('success', 'Event Deleted!');
    return res.redirect('/events/');
}

module.exports = controller;