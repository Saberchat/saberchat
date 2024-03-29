//LIBRARIES
const {convertToLink, embedLink} = require("../utils/convert-to-link");
const dateFormat = require('dateformat');
const path = require('path');
const {objectArrIndex, removeIfIncluded, parsePropertyArray} = require("../utils/object-operations");
const setup = require("../utils/setup");
const {cloudUpload, cloudDelete} = require('../services/cloudinary');
const {autoCompress} = require("../utils/image-compress");

//SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const {Event, PostComment} = require('../models/post');

const controller = {};

// Event GET index
controller.index = async function(req, res) {
    const platform = await setup(Platform);
    const users = await User.find({authenticated: true});
    let events;
    if (req.user && (await platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission))) {
        events = await Event.find({}).populate('sender');
    } else {events = await Event.find({verified: true}).populate('sender');}
    if(!platform || !users || !events) {
        req.flash('error', 'Cannot find events.');
        return res.redirect('back');
    }

    let current = [];
    let past = [];
    let date;
    for (let event of events) {
        date = new Date(parseInt(event.deadline.year), parseInt(event.deadline.month)-1, parseInt(event.deadline.day));
        if ((await date.getTime) > (await new Date().getTime())) {await past.push(event);}
        else {await current.push(event);}
    }

    const userNames = parsePropertyArray(users, "firstName").join(',').toLowerCase().split(',');
    let eventTexts;
    if (req.query.past) {
        eventTexts = await embedLink(req.user, past, userNames);
        return res.render('events/index', {platform, events: await past.reverse(), activeSearch: false, data: platform.features[objectArrIndex(platform.features, "route", "events")], eventTexts});   
    }
    eventTexts = await embedLink(req.user, current, userNames);
    return res.render('events/index', {platform, events: await current.reverse(), activeSearch: true, data: platform.features[objectArrIndex(platform.features, "route", "events")], eventTexts});
};

// Event GET new event
controller.new = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    return res.render('events/new', {platform, data: platform.features[objectArrIndex(platform.features, "route", "events")]});
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
    } else if (!event.verified && !(await platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission))) {
        req.flash('error', 'You cannot view that event');
        return res.redirect('back');
    }

    let date = new Date(parseInt(event.deadline.year), parseInt(event.deadline.month)-1, parseInt(event.deadline.day));
    let version = ((await date.getTime) < (await new Date().getTime()));

    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of event.mediaFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    const convertedText = await convertToLink(event.text); //Parse and add hrefs to all links in text
    return res.render('events/show', {platform, event, convertedText, fileExtensions, version, data: platform.features[objectArrIndex(platform.features, "route", "events")]});
};

// Event GET edit form
controller.updateForm = async function(req, res) {
    const platform = await setup(Platform);
    const event = await Event.findById(req.params.id);
    if(!platform || !event) {
        req.flash('error', 'Could not find event');
        return res.redirect('back');
    }
    if(!(await event.sender._id.equals(req.user._id))) {
        req.flash('error', 'You do not have permission to do that.');
        return res.redirect('back');
    }

    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of event.mediaFiles) {
        fileExtensions.set(media.url, path.extname(await media.url.split("SaberChat/")[1]));
    }
    return res.render('events/edit', {platform, event, fileExtensions, data: platform.features[objectArrIndex(platform.features, "route", "events")]});
};

// Event POST create
controller.create = async function(req, res) {
    const platform = await setup(Platform);
    const event = await Event.create({ //Build event with error info
        sender: req.user,
        subject: req.body.subject,
        text: req.body.message,
        deadline: {
            day: req.body.day,
            month: req.body.month,
            year: req.body.year
        },
        verified: !platform.postVerifiable //Event does not need to be verified if platform does not support verifying events
    });
    if (!platform || !event) {
        req.flash('error', 'Unable to create event');
        return res.redirect('back');
    }
    for (let attr of ["images", "links"]) {if (req.body[attr]) {event[attr] = req.body[attr];}} //Add images and links

    // if files were uploaded, process them
    if (req.files) {
        if (req.files.mediaFile) {
            let cloudErr;
            let cloudResult;
            for (let file of req.files.mediaFile) { //Upload each file to cloudinary
                const processedBuffer = await autoCompress(file.originalname, file.buffer);
                [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
                if (cloudErr || !cloudResult) {
                    req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }

                await event.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }

    event.date = dateFormat(event.created_at, "h:MM TT | mmm d");
    await event.save();

    if (platform.postVerifiable) {
        req.flash('success', `Event Posted! A platform ${await platform.permissionsDisplay[platform.permissionsDisplay.length-1].toLowerCase()} will verify your post soon.`);
    } else {
        req.flash('success', `Event Posted!`);
    }
    return res.redirect(`/events`);
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
    const event = await Event.findById(req.params.id).populate('sender');
    if (!platform || !event) {
        req.flash('error', "Unable to access event");
        return res.redirect('back');
    }

    if ((await event.sender._id.toString()) != (await req.user._id.toString())) {
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
        },
        verified: !platform.postVerifiable //Event does not need to be verified if platform does not support verifying events
    });
    if (!updatedEvent) {
        req.flash('error', "Unable to update event");
        return res.redirect('back');
    }
    for (let attr of ["images", "links"]) {if (req.body[attr]) {updatedEvent[attr] = req.body[attr];}} //Add images and links

    //Iterate through all selected media to remove and delete them
    let cloudErr;
    let cloudResult;
    for (let i = updatedEvent.mediaFiles.length-1; i >= 0; i--) {
        if (req.body[`deleteUpload-${updatedEvent.mediaFiles[i].url}`] && updatedEvent.mediaFiles[i] && updatedEvent.mediaFiles[i].filename) {
            //Evaluate filetype to decide on file deletion strategy
            switch(path.extname(await updatedEvent.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase()) {
                case ".mp3":
                case ".mp4":
                case ".m4a":
                case ".mov":
                    [cloudErr, cloudResult] = await cloudDelete(updatedEvent.mediaFiles[i].filename, "video");
                    break;
                case ".pdf":
                    [cloudErr, cloudResult] = await cloudDelete(updatedEvent.mediaFiles[i].filename, "pdf");
                    break;
                default:
                    [cloudErr, cloudResult] = await cloudDelete(updatedEvent.mediaFiles[i].filename, "image");
            }

            // Check For Failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
            await updatedEvent.mediaFiles.splice(i, 1);
        }
    }

    // if files were uploaded
    if (req.files) {
        if (req.files.mediaFile) {
            //Iterate through all new attached media
            for (let file of req.files.mediaFile) {
                const processedBuffer = await autoCompress(file.originalname, file.buffer);
                [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
                if (cloudErr || !cloudResult) {
                    req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }

                await updatedEvent.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }
    
    await updatedEvent.save();
    req.flash('success', 'Event Updated!');
    return res.redirect(`/events`);
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

    await event.likes.push(req.user._id); //Add likes to event
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
    if (!event) {return res.json({error: 'Error commenting'});}

    const comment = await PostComment.create({
        text: await req.body.text.split('<').join('&lt'),
        sender: req.user
    });
    if (!comment) {return res.json({error: 'Error commenting'});}

    comment.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
    await comment.save();

    await event.comments.push(comment);
    await event.save();

    let users = [];
    let user;
    //Search for any mentioned users
    for (let line of await comment.text.split(" ")) {
        if (line[0] == '@') {
            user = await User.findById(await line.split("#")[1].split("_")[0]);
            if (!user) {return res.json({error: "Error accessing user"});}
            await users.push(user);
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

    await comment.likes.push(req.user._id); //Add Like
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

    if ((await event.sender._id.toString()) != (await req.user._id.toString())) { //Doublecheck that deleter is eventer
        req.flash('error', "You can only delete events that you have posted");
        return res.redirect('back');
    }

    // delete any uploads
    let cloudErr;
    let cloudResult;
    for (let file of event.mediaFiles) {
        if (file && file.filename) {
            //Evaluate deleted files' filetype and delete accordingly
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

             if (cloudErr || !cloudResult || cloudResult.result !== 'ok') { // Check for Failure
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