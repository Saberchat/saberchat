//LIBRARIES
const dateFormat = require('dateformat');
const Filter = require('bad-words');
const filter = new Filter();
const path = require('path');
const {sendGridEmail} = require("../services/sendGrid");
const {convertToLink} = require("../utils/convert-to-link");
const { cloudUpload } = require('../services/cloudinary');
const {objectArrIndex, removeIfIncluded, parseKeysOrValues, parsePropertyArray, concatMatrix} = require("../utils/object-operations");
const setup = require("../utils/setup");

//SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const Message = require('../models/inbox/message');
const AccessReq = require('../models/inbox/accessRequest');
const Room = require('../models/chat/room');

const controller = {};

//INBOX MESSAGE ROUTES

// Inbox GET index page
controller.index = async function(req, res) {
    const platform = await setup(Platform);
    await req.user.populate({
            path: 'inbox',
			populate: {path: 'sender', select: ['username', 'imageUrl']}
        }).populate({
			path: 'requests',
			populate: [
                {path: 'requester', select: ['username', 'imageUrl']},
                {path: 'room', select: 'name'}
			]
		}).execPopulate();

    const activeRequests = req.user.requests.filter((req)=>req.status === "pending"); //Find all access requests for user's rooms that have not been handled
	return res.render('inbox/index', {platform, inbox: req.user.inbox.reverse(), requests: req.user.requests.reverse(), activeRequests});
};

// Inbox GET show message
controller.showMsg = async function(req, res) {
    const platform = await setup(Platform);
    const message = await Message.findById(req.params.id);
	if(!message) {req.flash('error','Cannot find message'); return res.redirect('back');}

    //Check message view permissions
    if(!message.toEveryone && !message.recipients.includes(req.user._id) && !message.sender.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to view this message');
        return res.redirect('back');
    }

    //If message has not been read yet, mark it as read
    if(!message.read.includes(req.user._id) && message.recipients.includes(req.user._id)) {
        req.user.msgCount -= 1;
        message.read.push(req.user._id);
        await req.user.save();
        await message.save();
    }

    await message.populate({path: 'sender', select: 'username'})
        .populate({path:'recipients', select: 'username'})
        .populate({path: 'read', select: 'username'})
        .populate({path: 'replies.sender'})
        .execPopulate();

    //Map of file extensions to ensure correct media format is rendered
    let fileExtensions = new Map();
    for (let media of message.mediaFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    const convertedText = convertToLink(message.text);
    return res.render('inbox/show', {platform, message, convertedText, fileExtensions});
};

// Inbox GET new message form
controller.newMsgForm = async function(req, res) {
    const platform = await setup(Platform);
    const users = await User.find({authenticated: true});
	if(!users) { req.flash('error', 'An Error Occurred.'); return res.redirect('back'); }
	return res.render('inbox/new', {
        platform, users,
        statuses: concatMatrix([
            platform.statusesProperty,
            platform.statusesPlural
        ]),
    }); //Render new message form with all users as recipient options
};

// Inbox GET sent messages
controller.sent = async function(req, res) {
    const platform = await setup(Platform);
    const messages = await Message.find({});
    if(!messages) { req.flash('error', 'An Error Occurred.'); return res.redirect('back');}

    let sent_msgs = []; // array of user's sent messages
    for(let message of messages) { // if user sent the message, push and continue
        if(message.sender.equals(req.user._id)) {
            sent_msgs.push(message);
            continue;
        }

        for(let reply of message.replies.reverse()) { // else check for user's replies by most recent
            if(reply.sender.equals(req.user._id)) { // push most recent reply by user
                break;
            }
        }
    }
    return res.render('inbox/index_sent', {platform, inbox: sent_msgs.reverse()});
};

// Inbox POST create messsage
controller.createMsg = async function(req, res) {
    const platform = await setup(Platform);
    let message = { //Build message
        subject: filter.clean(req.body.subject),
        text: filter.clean(req.body.message),
        mediaFiles: []
    };

    if(req.body.images) {
        message.images = req.body.images;
    }

    // if files were uploaded, handle them with cloudinary
    if (req.files) {
        let cloudErr;
        let cloudResult;
        if (req.files.mediaFile) {
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

                message.mediaFiles.push({ //Add cloudinary-uploaded images to message files
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }
    message.sender = req.user._id;
    message.noReply = (req.body.noreply == "true");

    //Builds recipient list based on front-end input
    let recipients = [];
    if(req.body.recipients) {
        recipients = JSON.parse(req.body.recipients);
    }

    //If message is anonymous/to everyone, override recipient list
    if(req.body.all == 'true') {
        message.toEveryone = true;
    } else if(!recipients || !recipients.length > 0) {
        req.flash('error', 'Please select recipients');
        return res.redirect('back');
    } else if(recipients.includes(req.user._id)) {
        req.flash('error', 'You cannot send messages to yourself');
        return res.redirect('back');
    } else if(req.body.anonymous == 'true') {
        const faculty = await User.find({authenticated: true, status: platform.teacherStatus, _id: { $in: recipients } });
        if(!faculty) {req.flash('error', 'An error occured'); return res.redirect('back');}
        //If message is anonymous without recipients
        if(faculty.length == 0) {req.flash('error', 'You can only select faculty'); return res.redirect('back');}
        recipients = parsePropertyArray(faculty, "_id");
        message.anonymous = true;
        delete message.sender;
    }

    //If statuses are selected as 'recipients', find corresponding users
    if(req.body.anonymous != 'true' && !message.toEveryone) {
        let selStatuses = [];
        for (let i = 0; i < platform.statusesProperty.length; i++) {
            const status = platform.statusesProperty[i];
            if(recipients.includes(status)) {
                selStatuses.push(status);
                removeIfIncluded(recipients, status);
            }
        }

        if(selStatuses.length > 0) {
            const selUsers = await User.find({authenticated: true, status:{$in: selStatuses}});
            if(!selUsers) {
                req.flash('error', 'An error occurred'); return res.redirect('back');
            }

            for (let i = 0; i < selUsers.length; i++) {
                const user = selUsers[i];
                if(!recipients.includes(user._id) && !user._id.equals(req.user._id)) {
                    recipients.push(user._id);
                }
            }
        }
    }
    message.recipients = recipients;

    const newMessage = await Message.create(message);
    if(!newMessage) {
        req.flash('error', 'Message could not be created'); return res.redirect('back');
    }

    newMessage.date = dateFormat(newMessage.created_at, "h:MM TT | mmm d");
    await newMessage.save();

    //Add message to recipients' inboxes
    if(message.toEveryone) {
        await User.updateMany(
            { _id: { $ne: req.user._id } },
            {
                $push: { inbox: newMessage },
                $inc: { msgCount: 1 }
            });

    } else {
        await User.updateMany(
            { _id: { $in: recipients } },
            {
                $push: { inbox: newMessage },
                $inc: { msgCount: 1 }
            });
    }

    const recipientList = await User.find({authenticated: true, _id: { $in: recipients}});
    let imageString = "";
    for (let image of newMessage.images) {
    imageString += `<img src="${image}">`;
    }

    let recipientArr = [];
    for (const r of recipientList) {
        recipientArr = [];
        for (const rec of recipientList) {
            if (rec._id.equals(r._id)) {
                recipientArr.push('me');

            } else {
                recipientArr.push(rec.username);
            }
        }

        //Send email alerting recipients about notification
        let emailText;
        if(message.toEveryone) {
            emailText = `<p>Hello ${r.firstName},</p><p>You have a new Saberchat inbox notification from <strong>${req.user.username}</strong>!</p><p><strong>To</strong>: Everyone</p><p>${newMessage.text}</p><p>You can access the full message at https://saberchat.net</p> ${imageString}`;
        } else if(message.anonymous) {
            emailText = `<p>Hello ${r.firstName},</p><p>You have a new Saberchat anonymous notification!</p><p><strong>To</strong>: ${recipientArr.join(', ')}</p><p>${newMessage.text}</p><p>You can access the full message at https://saberchat.net</p> ${imageString}`;
        } else {
            emailText = `<p>Hello ${r.firstName},</p><p>You have a new Saberchat inbox notification from <strong>${req.user.username}</strong>!</p><p><strong>To</strong>: ${recipientArr.join(', ')}</p><p>${newMessage.text}</p><p>You can access the full message at https://saberchat.net</p> ${imageString}`;
        }

        if(r.receiving_emails) {
            await sendGridEmail(r.email, `New Inbox Notification - ${newMessage.subject}`, emailText, false);
        }
    }

    req.flash('success', 'Message sent');
    return res.redirect(`/inbox/${newMessage._id}`);
};

// Inbox PUT mark all messages as read
controller.markReadAll = async function(req, res) {
    const result = await Message.updateMany(
        {_id: {$in: req.user.inbox}, read: {$ne: req.user._id}},
        {$push: {read: req.user._id}}
    );
    req.user.msgCount -= result.nModified; //Subtract the number of modified messages from new message count
    await req.user.save();
    req.flash('success', 'Marked all as read.');
    return res.redirect('back');
};

// Inbox PUT mark selected messages as read
controller.markReadSelected = async function(req, res) {
    const result = await Message.updateMany(
        {_id: {$in: parseKeysOrValues(req.body, "body")}, read: {$ne: req.user._id}},
        {$push: {read: req.user._id}}
    );
    req.user.msgCount -= result.nModified; //Subtract the number of modified messages from new message count
    await req.user.save();
    req.flash('success', 'Marked as read');
    return res.redirect('back');
};

// Inbox DELETE clear inbox
controller.clear = async function(req, res) {
    req.user.inbox = [];
	req.user.msgCount = 0;
	await req.user.save();
	req.flash('success', 'Inbox cleared!');
	return res.redirect('/inbox');
};

// Inbox PUT reply to message
controller.reply = async function(req, res) {
    const message = await Message.findById(req.body.message).populate('recipients').populate('sender');
    if(!message) {
        return res.json({error: 'Error finding message'});
    } else if(message.anonymous || message.noReply) { //In either of these cases, you cannot reply to the message
        return res.json({error: 'Cannot reply to this message'})
    }

    const reply = { //Build reply object
        sender: req.user,
        text: req.body.text,
        images: req.body.images,
        date: dateFormat(new Date(), "h:MM TT | mmm d")
    };
    message.replies.push(reply); //Add reply to message thread

    //Create string to track reply's images
    let imageString = "";
    if (reply.images) {
        for (let image of reply.images) {
            imageString += `<img src="${image}">`;
        }
    }

    let readRecipients = message.read; //Users who have read the original message will need to have their msgCount incremented again

    //Iterates through the recipients and sees if the sender is part of them. If not, then no reply has been sent yet, but since the sender has sent the message, they have 'read' it. Hence, they are added to the readRecipients array.
    if (objectArrIndex(message.recipients, "_id", message.sender._id) == -1) {
        readRecipients.push(message.sender);
    }
    removeIfIncluded(message.recipients, message.sender._id, "_id"); //If the original sender is already part of the recipients, remove them just in case

    message.recipients.push(message.sender); //Add original sender to recipient list (code above ensures that they are not added multiple times)
    message.read = [req.user]; //Since the current user replied to this message, they've seen the completely updated message. Nobody else has
    await message.save();

    for (let recipient of message.recipients) { //Remove original message and add it back so that it appears 'new'
        removeIfIncluded(recipient.inbox, message._id); //Remove message from recipient's inbox
        recipient.inbox.push(message._id); //Add it to the front of the recipient's inbox

        //If the recipient has already read this message and it is not the person sending the reply (or the recipient is the original message sender), increment their message count again
        if (readRecipients.includes(recipient._id) && !(recipient._id.equals(req.user._id))) {
            recipient.msgCount += 1;
        }
        await recipient.save();
        if (!(recipient._id.equals(req.user._id)) && recipient.receiving_emails) { //Send email alerting recipients of reply
            const emailText = `<p>Hello ${recipient.firstName},</p><p><strong>${req.user.username}</strong> replied to <strong>${message.subject}</strong>.<p>${reply.text}</p><p>You can access the full message at https://saberchat.net</p> ${imageString}`;
            await sendGridEmail(recipient.email, `New Reply On ${message.subject}`, emailText, false);
        }
    }
    return res.json({success: `Replied to ${message._id}`, message, darkmode: req.user.darkmode});
};

// Inbox DELETE messages
controller.delete = async function(req, res) {
    const messages = await Message.find({_id: {$in: parseKeysOrValues(req.body, "keys")}}); //Extract message ids from form body
    if(!messages) {req.flash('error', 'Could not find messages'); return res.redirect('back');}

    messages.forEach( message => { //Iterate through messages and remove any selected ones from user's inbox
        removeIfIncluded(req.user.inbox, message._id);
        if(!message.read.includes(req.user._id)) {
            req.user.msgCount -= 1;
        }
    });
    await req.user.save();
    return res.redirect('back');
};

// ACCESS REQUEST ROUTES

controller.showReq = async function(req, res) { //Display access request
    const platform = await setup(Platform);
    const request = await AccessReq.findById(req.params.id)
    .populate({path: 'requester', select: 'username'})
    .populate({path: 'room', select: ['creator', 'name']});
    if(!request) {req.flash('error', 'An Error Occurred.'); return res.redirect('back');}
    return res.render('inbox/requests/show', {platform, request});
};

controller.acceptReq = async function(req, res) { //Accept access request
    const request = await AccessReq.findById(req.params.id)
    .populate({path: 'room', select: ['creator']}).populate('requester');

    if(!request) {
        req.flash("error", "An Error Occurred");
        return res.redirect('back');

    } else if(!request.room.creator.equals(req.user._id)) { //Check for necessary permissions
        req.flash("error", "You do not have permission to do that");
        return res.redirect('back');

    } else if(request.status != 'pending') { //'Pending' signifies a request that needs to be handled, otherwise they have been accepted/rejected
        req.flash('error', 'Request already handled');
        return res.redirect('back');
    }

    //If request is accepted, add user to room and save it
    const room = await Room.findById(request.room._id);
    if(!room) { req.flash("error", "An Error Occurred");return res.redirect('back'); }
    room.members.push(request.requester);
    request.status = 'accepted'; //Update request status
    req.user.reqCount --;
    await room.save();
    await request.save();
    await req.user.save();

    //Send notification alerting user that they have been accepted
    if(request.requester.receiving_emails) {
        const emailText = `<p>Hello ${request.requester.firstName},</p><p>Your request to join chat room <strong>${room.name}</strong> has been accepted!<p><p>You can access the room at https://saberchat.net</p>`;
        await sendGridEmail(request.requester.email, `Room Request Accepted - ${room.name}`, emailText, false);
    }

    req.flash('success', 'Request accepted');
    return res.redirect('/inbox');
};

controller.rejectReq = async function(req, res) { //Reject access request
    const request = await AccessReq.findById(req.params.id).populate('room').populate('requester');
    if(!request) {
        req.flash("error", "An Error Occurred");
        return res.redirect('back');
    }

    if (!request.room.creator.equals(req.user._id)) { //Check for necessary permissions
        req.flash("error", "You do not have permission to do that");
        return res.redirect('back');
    }

    if(request.status != 'pending') {
        req.flash('error', 'Request already handled');
        return res.redirect('back');
    }

    //Update request status
    request.status = 'rejected';
    req.user.reqCount --;
    await request.save();
    await req.user.save();

    if(request.requester.receiving_emails) {
        const emailText = `<p>Hello ${request.requester.firstName},</p><p>Your request to join chat room <strong>${request.room.name}</strong> has been rejected. Contact the room creator, <strong>${request.room.creator.username}</strong>, if you think that there has been a mistake.</p>`;
        await sendGridEmail(request.requester.email, `Room Request Rejected - ${request.room.name}`, emailText, false);
    }

    req.flash('success', 'Request rejected');
    return res.redirect('/inbox');
};

module.exports = controller;