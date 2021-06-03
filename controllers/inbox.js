//LIBRARIES
const dateFormat = require('dateformat');
const Filter = require('bad-words');
const filter = new Filter();
const path = require('path');
const {sendGridEmail} = require("../services/sendGrid");
const {convertToLink} = require("../utils/convert-to-link");
const {cloudUpload} = require('../services/cloudinary');
const {autoCompress} = require("../utils/image-compress");
const {objectArrIndex, removeIfIncluded, parseKeysOrValues, parsePropertyArray, concatMatrix} = require("../utils/object-operations");
const setup = require("../utils/setup");

//SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const {ChatRoom} = require('../models/group');
const {AccessRequest, InboxMessage} = require("../models/notification");

const controller = {};

//INBOX MESSAGE ROUTES

// Inbox GET index page
controller.index = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }
    await req.user.populate({
            path: 'inbox.message',
			populate: {path: 'author', select: ['username', 'imageUrl']}
        }).populate({
			path: 'requests',
			populate: [
                {path: 'author', select: ['username', 'imageUrl']},
                {path: 'room', select: 'name'}
			]
		}).execPopulate();

    const activeRequests = await req.user.requests.filter((req)=>req.status === "pending"); //Find all access requests for user's rooms that have not been handled
	return res.render('inbox/index', {platform, inbox: await req.user.inbox.reverse(), requests: await req.user.requests.reverse(), activeRequests});
};

// Inbox GET show message
controller.showMsg = async function(req, res) {
    const platform = await setup(Platform);
    const message = await InboxMessage.findById(req.params.id);
	if(!platform || !message) {
        await req.flash('error','Cannot find message');
        return res.redirect('back');
    }

    //Check message view permissions
    if(!message.toEveryone && !(await message.recipients.includes(req.user._id)) && !(await message.author.equals(req.user._id))) {
        await req.flash('error', 'You do not have permission to view this message');
        return res.redirect('back');
    }

    //If message has not been read yet, mark it as read
    if(!message.read.includes(req.user._id) && (await message.recipients.includes(req.user._id))) {
        req.user.inbox[await objectArrIndex(req.user.inbox, "message", message._id)].new = false;
        await message.read.push(req.user._id);
        await req.user.save();
        await message.save();
    }

    await message.populate({path: 'author', select: 'username'})
        .populate({path:'recipients', select: 'username'})
        .populate({path: 'read', select: 'username'})
        .populate({path: 'replies.author'})
        .execPopulate();

    //Map of file extensions to ensure correct media format is rendered
    let fileExtensions = new Map();
    for (let media of message.mediaFiles) {
        await fileExtensions.set(media.url, await path.extname(await media.url.split("SaberChat/")[1]));
    }

    for (let reply of message.replies) {
        for (let media of reply.mediaFiles) {
            await fileExtensions.set(media.url, await path.extname(await media.url.split("SaberChat/")[1]));
        }
    }
    return res.render('inbox/show', {platform, message, convertedText: await convertToLink(message.text), fileExtensions});
};

// Inbox GET new message form
controller.newMsgForm = async function(req, res) {
    const platform = await setup(Platform);
    const users = await User.find({authenticated: true});
	if(!platform || !users) {
        await req.flash('error', 'An Error Occurred.');
        return res.redirect('back');
    }
	return res.render('inbox/new', {
        platform, users,
        statuses: await concatMatrix([
            platform.statusesProperty,
            platform.statusesPlural
        ]),
    }); //Render new message form with all users as recipient options
};

// Inbox GET sent messages
controller.sent = async function(req, res) {
    const platform = await setup(Platform);
    const messages = await InboxMessage.find({});
    if(!platform || !messages) {
        await req.flash('error', 'An Error Occurred.');
        return res.redirect('back');
    }

    let sent_msgs = []; // array of user's sent messages
    for(let message of messages) { // if user sent the message, push and continue
        if(await message.author.equals(req.user._id)) {
            await sent_msgs.push(message);
            continue;
        }

        for(let reply of await message.replies.reverse()) { // else check for user's replies by most recent
            if(await reply.author.equals(req.user._id)) {break;}
        }
    }
    return res.render('inbox/index_sent', {platform, inbox: await sent_msgs.reverse()});
};

//Inbox new message recipient search
controller.searchRecipients = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {return res.json({error: "An error occurred"});}

    //Collect user data based on form
    let users;
    if (req.body.anonymous) {
        users = await User.find({authenticated: true, _id: {$ne: req.user._id}, status: platform.teacherStatus});
    } else {
        users = await User.find({authenticated: true, _id: {$ne: req.user._id}});
    }
    if (!users) {return res.json({error: "An error occurred"});}

    let recipients = [];
    let displayValue;

    if (!req.body.anonymous) { //Only add other statuses if the message is not anonymous
        for (let status of platform.statusesProperty) { //Iterate through statuses and search for matches
            displayValue = platform.statusesPlural[platform.statusesProperty.indexOf(status)];
            if (await `${status} ${displayValue}`.toLowerCase().includes(await req.body.text.toLowerCase())) {
                await recipients.push({ //Add status to array, using display and id values
                    displayValue,
                    idValue: status,
                    type: "status"
                });
            }
        }
    }

    for (let user of users) { //Iterate through usernames and search for matches
        if (await `${user.firstName} ${user.lastName} ${user.username}`.toLowerCase().includes(await req.body.text.toLowerCase())) {
            await recipients.push({ //Add user to array, using username as display, and id as id value
                displayValue: `${user.firstName} ${user.lastName} (${user.username})`, 
                idValue: user._id,
                classValue: user.status,
                type: "user"
            });
        }
    }

    return res.json({success: "Successfully collected data", recipients});
}

// Inbox POST create messsage
controller.createMsg = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

    let message = { //Build message
        subject: await filter.clean(req.body.subject),
        text: await filter.clean(req.body.message),
        mediaFiles: []
    };

    if(req.body.images) { message.images = req.body.images;}

    // if files were uploaded, handle them with cloudinary
    if (req.files) {
        let cloudErr;
        let cloudResult;
        if (req.files.mediaFile) {
            for (let file of req.files.mediaFile) {
                const processedBuffer = await autoCompress(file.originalname, file.buffer);
                [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
                if (cloudErr || !cloudResult) {
                    await req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }

                await message.mediaFiles.push({ //Add cloudinary-uploaded images to message files
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }
    message.author = req.user._id;
    message.noReply = (req.body.noreply == "true");

    //Builds recipient list based on front-end input
    let recipients = [];
    if(req.body.recipients) {
        recipients = await JSON.parse(req.body.recipients);
    }

    //If message is anonymous/to everyone, override recipient list
    if(req.body.all == 'true') {
        message.toEveryone = true;
    } else if(!recipients || !recipients.length > 0) {
        await req.flash('error', 'Please select recipients');
        return res.redirect('back');
    } else if(await recipients.includes(req.user._id)) {
        await req.flash('error', 'You cannot send messages to yourself');
        return res.redirect('back');
    } else if(req.body.anonymous == 'true') {
        const faculty = await User.find({authenticated: true, status: platform.teacherStatus, _id: { $in: recipients } });
        if(!faculty) {
            await req.flash('error', 'An error occured');
            return res.redirect('back');
        }
        if(faculty.length == 0) { //If message is anonymous without recipients
            await req.flash('error', 'You can only select faculty');
            return res.redirect('back');
        }
        recipients = await parsePropertyArray(faculty, "_id");
        message.anonymous = true;
        delete message.author;
    }

    //If statuses are selected as 'recipients', find corresponding users
    if(req.body.anonymous != 'true' && !message.toEveryone) {
        let selStatuses = [];
        for (let i = 0; i < platform.statusesProperty.length; i++) {
            const status = platform.statusesProperty[i];
            if(await recipients.includes(status)) {
                await selStatuses.push(status);
                await removeIfIncluded(recipients, status);
            }
        }

        if(selStatuses.length > 0) {
            const selUsers = await User.find({authenticated: true, status:{$in: selStatuses}});
            if(!selUsers) {
                await req.flash('error', 'An error occurred');
                return res.redirect('back');
            }

            for (let i = 0; i < selUsers.length; i++) {
                const user = selUsers[i];
                if(!(await recipients.includes(user._id)) && !(await user._id.equals(req.user._id))) {await recipients.push(user._id);}
            }
        }
    }
    message.recipients = recipients;

    const newMessage = await InboxMessage.create(message);
    if(!newMessage) {
        await req.flash('error', 'Message could not be created');
        return res.redirect('back');
    }

    newMessage.date = await dateFormat(newMessage.created_at, "h:MM TT | mmm d");
    await newMessage.save();

    //Add message to recipients' inboxes
    if(message.toEveryone) {
        await User.updateMany(
            { _id: { $ne: req.user._id } },
            {$push: { inbox: {message: newMessage, new: true}}
        });

    } else {
        await User.updateMany(
            { _id: { $in: recipients } },
            {$push: { inbox: {message: newMessage, new: true}}
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
            if (await rec._id.equals(r._id)) {await recipientArr.push('me');
            } else {await recipientArr.push(rec.username);}
        }

        //Send email alerting recipients about notification
        let emailText;
        if(message.toEveryone) {
            emailText = `<p>Hello ${r.firstName},</p><p>You have a new Saberchat inbox notification from <strong>${req.user.username}</strong>!</p><p><strong>To</strong>: Everyone</p><p>${newMessage.text}</p><p>You can access the full message at https://${platform.url}</p> ${imageString}`;
        } else if(message.anonymous) {
            emailText = `<p>Hello ${r.firstName},</p><p>You have a new Saberchat anonymous notification!</p><p><strong>To</strong>: ${await recipientArr.join(', ')}</p><p>${newMessage.text}</p><p>You can access the full message at https://${platform.url}</p> ${imageString}`;
        } else {
            emailText = `<p>Hello ${r.firstName},</p><p>You have a new Saberchat inbox notification from <strong>${req.user.username}</strong>!</p><p><strong>To</strong>: ${await recipientArr.join(', ')}</p><p>${newMessage.text}</p><p>You can access the full message at https://${platform.url}</p> ${imageString}`;
        }

        if(r.receiving_emails) {
            await sendGridEmail(r.email, `New Inbox Notification - ${newMessage.subject}`, emailText, false);
        }
    }

    await req.flash('success', 'Message sent');
    return res.redirect(`/inbox/${newMessage._id}`);
};

// Inbox PUT mark all messages as read
controller.markReadAll = async function(req, res) {
    await InboxMessage.updateMany(
        {_id: {$in: await parsePropertyArray(req.user.inbox, "message")}, read: {$ne: req.user._id}},
        {$push: {read: req.user._id}}
    );
    for (let message of req.user.inbox) {
        message.new = false;
    }
    await req.user.save();
    await req.flash('success', 'Marked all as read.');
    return res.redirect('back');
};

// Inbox PUT mark selected messages as read
controller.markReadSelected = async function(req, res) {
    await InboxMessage.updateMany(
        {_id: {$in: await parseKeysOrValues(req.body, "body")}, read: {$ne: req.user._id}},
        {$push: {read: req.user._id}}
    );

    for (let message of req.user.inbox) {
        if (await parseKeysOrValues(req.body, "body").toString().includes(await message.message.toString())) {
            message.new = false;
        }
    }
    await req.user.save();
    await req.flash('success', 'Marked as read');
    return res.redirect('back');
};

// Inbox DELETE clear inbox
controller.clear = async function(req, res) {
    req.user.inbox = [];
	await req.user.save();
	await req.flash('success', 'Inbox cleared!');
	return res.redirect('/inbox');
};

// Inbox PUT reply to message
controller.reply = async function(req, res) {
    const platform = await setup(Platform);
    const message = await InboxMessage.findById(req.params.id).populate('recipients').populate('author');
    if(!platform || !message) {
        await req.flash("error", "Unable to find message");
        return res.redirect("back");
    } else if(message.anonymous || message.noReply) { //In either of these cases, you cannot reply to the message
        await req.flash("error", "You cannot reply to this message");
        return res.redirect("back");
    }

    const reply = { //Build reply object
        author: req.user,
        text: req.body.text,
        images: [],
        date: await dateFormat(new Date(), "h:MM TT | mmm d"),
        mediaFiles: []
    };

    if(req.body.images) {reply.images = req.body.images;}

    // if files were uploaded, handle them with cloudinary
    if (req.files) {
        let cloudErr;
        let cloudResult;
        if (req.files.mediaFile) {
            for (let file of req.files.mediaFile) {
                const processedBuffer = await autoCompress(file.originalname, file.buffer);
                [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
                if (cloudErr || !cloudResult) {
                    await req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }

                await reply.mediaFiles.push({ //Add cloudinary-uploaded images to message files
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }

    await message.replies.push(reply); //Add reply to message thread

    //Create string to track reply's images
    let imageString = "";
    if (reply.images) {
        for (let image of reply.images) {
            imageString += `<img src="${image}">`;
        }
    }

    //Iterates through the recipients and sees if the author is part of them. If not, then no reply has been sent yet, but since the author has sent the message, they have 'read' it. Hence, they are added to the readRecipients array.
    await removeIfIncluded(message.recipients, message.author._id, "_id"); //If the original author is already part of the recipients, remove them just in case
    await message.recipients.push(message.author); //Add original author to recipient list (code above ensures that they are not added multiple times)
    message.read = [req.user]; //Since the current user replied to this message, they've seen the completely updated message. Nobody else has
    await message.save();

    for (let recipient of message.recipients) { //Remove original message and add it back so that it appears 'new'
        await removeIfIncluded(recipient.inbox, message._id, "message"); //Remove message from recipient's inbox
        if (!(await recipient._id.equals(req.user._id))) { //Add new message to everyone except current replier's inbox
            await recipient.inbox.push({message: message._id, new: true});
            await recipient.save();
        }

        if (!(await recipient._id.equals(req.user._id)) && recipient.receiving_emails) { //Send email alerting recipients of reply
            const emailText = `<p>Hello ${recipient.firstName},</p><p><strong>${req.user.username}</strong> replied to <strong>${message.subject}</strong>.<p>${reply.text}</p><p>You can access the full message at https://${platform.url}</p> ${imageString}`;
            await sendGridEmail(recipient.email, `New Reply On ${message.subject}`, emailText, false);
        }
    }
    await req.flash("success", "Replied to message!");
    return res.redirect(`/inbox/${message._id}`);
};

// Inbox DELETE messages
controller.delete = async function(req, res) {
    const messages = await InboxMessage.find({_id: {$in: await parseKeysOrValues(req.body, "keys")}}); //Extract message ids from form body
    if(!messages) {
        await req.flash('error', 'Could not find messages');
        return res.redirect('back');
    }
    for (let message of messages) {
        await removeIfIncluded(req.user.inbox, message._id, "message"); //Iterate through messages and remove any selected ones from user's inbox
    }
    await req.user.save();
    return res.redirect('back');
};

// ACCESS REQUEST ROUTES

controller.showReq = async function(req, res) { //Display access request
    const platform = await setup(Platform);
    const request = await AccessRequest.findById(req.params.id)
    .populate({path: 'author', select: 'username'})
    .populate({path: 'room', select: ['creator', 'name']});
    if(!platform || !request) {
        await req.flash('error', 'An Error Occurred.');
        return res.redirect('back');
    }
    return res.render('inbox/requests/show', {platform, request});
};

controller.acceptReq = async function(req, res) { //Accept access request
    const platform = await setup(Platform);
    const request = await AccessRequest.findById(req.params.id)
    .populate({path: 'room', select: ['creator']}).populate('author');

    if(!platform || !request) {
        await req.flash("error", "An Error Occurred");
        return res.redirect('back');

    } else if(!(await request.room.creator.equals(req.user._id))) { //Check for necessary permissions
        await req.flash("error", "You do not have permission to do that");
        return res.redirect('back');

    } else if(request.status != 'pending') { //'Pending' signifies a request that needs to be handled, otherwise they have been accepted/rejected
        await req.flash('error', 'Request already handled');
        return res.redirect('back');
    }

    //If request is accepted, add user to room and save it
    const room = await ChatRoom.findById(request.room._id);
    if(!room) {
        await req.flash("error", "An Error Occurred");
        return res.redirect('back'); 
    }
    await room.members.push(request.author);
    request.status = 'accepted'; //Update request status
    await removeIfIncluded(req.user.requests, request._id);
    await room.save();
    await request.save();
    await req.user.save();

    //Send notification alerting user that they have been accepted
    if(request.author.receiving_emails) {
        const emailText = `<p>Hello ${request.author.firstName},</p><p>Your request to join chat room <strong>${room.name}</strong> has been accepted!<p><p>You can access the room at https://${platform.url}</p>`;
        await sendGridEmail(request.author.email, `Room Request Accepted - ${room.name}`, emailText, false);
    }

    await req.flash('success', 'Request accepted');
    return res.redirect('/inbox');
};

controller.rejectReq = async function(req, res) { //Reject access request
    const request = await AccessRequest.findById(req.params.id).populate('room').populate('author');
    if(!request) {
        await req.flash("error", "An Error Occurred");
        return res.redirect('back');
    }

    if (!await request.room.creator.equals(req.user._id)) { //Check for necessary permissions
        await req.flash("error", "You do not have permission to do that");
        return res.redirect('back');
    }

    if(request.status != 'pending') {
        await req.flash('error', 'Request already handled');
        return res.redirect('back');
    }

    //Update request status
    request.status = 'rejected';
    await removeIfIncluded(req.user.requests, request._id);
    await request.save();
    await req.user.save();

    if(request.author.receiving_emails) {
        const emailText = `<p>Hello ${request.author.firstName},</p><p>Your request to join chat room <strong>${request.room.name}</strong> has been rejected. Contact the room creator, <strong>${request.room.creator.username}</strong>, if you think that there has been a mistake.</p>`;
        await sendGridEmail(request.author.email, `Room Request Rejected - ${request.room.name}`, emailText, false);
    }

    await req.flash('success', 'Request rejected');
    return res.redirect('/inbox');
};

module.exports = controller;