const dateFormat = require('dateformat');
const Filter = require('bad-words');
const filter = new Filter();
const path = require('path');
const { sendGridEmail } = require("../utils/transport");
const convertToLink = require("../utils/convert-to-link");
const { cloudUpload } = require('../services/cloudinary');

const User = require('../models/user');
const Message = require('../models/message');
const AccessReq = require('../models/accessRequest');
const Room = require('../models/room');

// Inbox GET index page
module.exports.index = async function(req, res) {
    await req.user.populate(
		{
			path: 'inbox',
			populate: {
				path: 'sender',
				select: ['username', 'imageUrl']
			}
		}
        ).populate(
		{
			path: 'requests',
			populate: [
				{ path: 'requester', select: ['username', 'imageUrl']},
				{ path: 'room', select: 'name'}
			]
		}
        ).execPopulate();

    const activeReqCount = req.user.requests.filter((req)=>req.status === "pending").length;

	return res.render('inbox/index', {inbox: req.user.inbox.reverse(), requests: req.user.requests.reverse(), reqCount: activeReqCount});
};

// Inbox GET show message
module.exports.showMsg = async function(req, res) {
    const message = await Message.findById(req.params.id);
	if(!message) {req.flash('error','Cannot find message'); return res.redirect('back');}

    if(!message.toEveryone && !message.recipients.includes(req.user._id) && !message.sender.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to view this message');
        return res.redirect('back');
    }

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

    let fileExtensions = new Map();
    for (let media of message.imageFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    const convertedText = convertToLink(message.text);
    return res.render('inbox/show', {message: message, convertedText, fileExtensions});
};

// Inbox GET new message form
module.exports.newMsgForm = async function(req, res) {
    const users = await User.find({authenticated: true});
	if(!users) { req.flash('error', 'Unable to access Database.'); return res.redirect('back'); }
	return res.render('inbox/new', {users: users});
};

// Inbox GET sent messages
module.exports.sent = async function(req, res) {
    const messages = await Message.find({});
    if(!messages) { req.flash('error', 'Unable to access Database.'); return res.redirect('back');}

    let sent_msgs = []; // array of user's sent messages

    for(const message of messages) {
        // if user sent the message, push and continue
        if(message.sender.equals(req.user._id)) {
            sent_msgs.push(message);
            continue;
        }

        // else check for user's replies by most recent
        for(const reply of message.replies.reverse()) {
            if(reply.sender.equals(req.user._id)) {
                // push most recent reply by user
                // sent_msgs.push(reply); // this breaks the ejs currently
                break;
            }
        }
    }

    return res.render('inbox/index_sent', {inbox: sent_msgs.reverse()});
};

// Inbox POST create messsage
module.exports.createMsg = async function(req, res) {
    let message = {
        subject: filter.clean(req.body.subject),
        text: filter.clean(req.body.message),
        imageFiles: []
    };

    if(req.body.images) {
        message.images = req.body.images;
    }

    // if files were uploaded
    if (req.files) {
        let cloudErr;
        let cloudResult;
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

            message.imageFiles.push({
                filename: cloudResult.public_id,
                url: cloudResult.secure_url,
                originalName: file.originalname
            });
        }
    }

    message.sender = req.user._id;
    message.noReply = (req.body.noreply == "true");

    let recipients = [];

    if(req.body.recipients) {
        recipients = JSON.parse(req.body.recipients);
    }

    if(req.body.all == 'true') {
        message.toEveryone = true;
    } else if(!recipients || !recipients.length > 0) {
        req.flash('error', 'Please select recipients');
        return res.redirect('back');
    } else if(recipients.includes(req.user._id)) {
        req.flash('error', 'You cannot send messages to yourself');
        return res.redirect('back');
    } else if(req.body.anonymous == 'true') {
        const faculty = await User.find({authenticated: true, status: 'faculty', _id: { $in: recipients } });

        if(!faculty) {req.flash('error', 'An error occured'); return res.redirect('back');}
        if(!faculty.length > 0) {req.flash('error', 'You can only select faculty'); return res.redirect('back');}

        recipients = [];
        faculty.forEach(user => {
            recipients.push(user._id);
        });

        message.anonymous = true;
        delete message.sender;
    }

    const statuses = ['7th', '8th', '9th', '10th', '11th', '12th', 'faculty', 'parent', 'alumnus', 'guest'];

    if(req.body.anonymous != 'true' && !message.toEveryone) {
        let selStatuses = [];
        for (let i = 0; i < statuses.length; i++) {
            const status = statuses[i];
            if(recipients.includes(status)) {
                selStatuses.push(status);
                const index = recipients.indexOf(status);
                recipients.splice(index, 1);
            }
        }

        if(selStatuses.length > 0) {
            const selUsers = await User.find({authenticated: true, status:{$in: selStatuses}});

            if(!selUsers) {
                req.flash('error', 'Error connecting to database'); return res.redirect('back');
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

        let emailText;
        if(message.toEveryone) {
            emailText = `<p>Hello ${r.firstName},</p><p>You have a new Saberchat inbox notification from <strong>${req.user.username}</strong>!</p><p><strong>To</strong>: Everyone</p><p>${newMessage.text}</p><p>You can access the full message at https://alsion-saberchat.herokuapp.com</p> ${imageString}`;
        } else if(message.anonymous) {
            emailText = `<p>Hello ${r.firstName},</p><p>You have a new Saberchat anonymous notification!</p><p><strong>To</strong>: ${recipientArr.join(', ')}</p><p>${newMessage.text}</p><p>You can access the full message at https://alsion-saberchat.herokuapp.com</p> ${imageString}`;
        } else {
            emailText = `<p>Hello ${r.firstName},</p><p>You have a new Saberchat inbox notification from <strong>${req.user.username}</strong>!</p><p><strong>To</strong>: ${recipientArr.join(', ')}</p><p>${newMessage.text}</p><p>You can access the full message at https://alsion-saberchat.herokuapp.com</p> ${imageString}`;
        }

        if(r.receiving_emails) {
            await sendGridEmail(r.email, `New Inbox Notification - ${newMessage.subject}`, emailText);
        }
    }

    req.flash('success', 'Message sent');
    return res.redirect(`/inbox/${newMessage._id}`);
};

// Inbox PUT mark all messages as read
module.exports.markReadAll = async function(req, res) {
    const result = await Message.updateMany(
        {
            _id: {$in: req.user.inbox},
            read: {$ne: req.user._id}
        },
        {
            $push: {read: req.user._id}
        });
    req.user.msgCount -= result.nModified;
    await req.user.save();
    req.flash('success', 'Marked all as read.');
    return res.redirect('back');
};

// Inbox PUT mark selected messages as read
module.exports.markReadSelected = async function(req, res) {
    let ids = [];
	for(const id in req.body) {
		ids.push(id);
	}
    const result = await Message.updateMany(
        {
            _id: {$in: ids},
            read: {$ne: req.user._id}
        },
        {
            $push: {read: req.user._id}
        });
    req.user.msgCount -= result.nModified;
    req.user.save();
    req.flash('success', 'Marked as read');
    return res.redirect('back');
};

// Inbox DELETE clear inbox
module.exports.clear = function(req, res) {
    req.user.inbox = [];
	req.user.msgCount = 0;
	req.user.save();
	req.flash('success', 'Inbox cleared!');
	return res.redirect('/inbox');
};

// Inbox PUT reply to message
module.exports.reply = async function(req, res) {
    const message = await Message.findById(req.body.message).populate('recipients').populate('sender').exec();
    if(!message) {
        return res.json({error: 'Error finding message'});
    } else if(message.anonymous || message.noReply) {
        return res.json({error: 'Cannot reply to this message'})
    }

    let reply = {
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

    let senderIncluded = false; //Checks whether the sender is part of the thread
    for (const recipient of message.recipients) {
        if (recipient._id.equals(message.sender._id)) {
            senderIncluded = true;
            break;
        }
    }
    if(!senderIncluded) {
        readRecipients.push(message.sender);
    }
    for (let i = message.recipients.length-1; i >= 0; i--) { //If the original sender is already part of the recipients, remove them just in case
        if (message.recipients[i]._id.equals(message.sender._id)) {
          message.recipients.splice(i, 1);
        }
    }

    message.recipients.push(message.sender); //Add original sender to recipient list (code above ensures that they are not added multiple times)
    message.read = [req.user]; //Since the current user replied to this message, they've seen the completely updated message. Nobody else has
    await message.save();

    for (const recipient of message.recipients) { //Remove original message and add it back so that it appears 'new'

        //Remove message from recipient's inbox
        for (let i = recipient.inbox.length - 1; i >= 0; i --) {
            if (recipient.inbox[i].equals(message._id)) {
            recipient.inbox.splice(i, 1);
            }
        }

        //Add it to the front of the recipient's inbox
        recipient.inbox.push(message._id);

        //If the recipient has already read this message and it is not the person sending the reply (or the recipient is the original message sender), increment their message count again
        if (readRecipients.includes(recipient._id) && !(recipient._id.equals(req.user._id))) {
            recipient.msgCount += 1;
        }

        recipient.save();

        //Send email notifying about the reply to everyone except person who posted the reply
        if (!(recipient._id.equals(req.user._id)) && recipient.receiving_emails) {
            const emailText = `<p>Hello ${recipient.firstName},</p><p><strong>${req.user.username}</strong> replied to <strong>${message.subject}</strong>.<p>${reply.text}</p><p>You can access the full message at https://alsion-saberchat.herokuapp.com</p> ${imageString}`;

            await sendGridEmail(recipient.email, `New Reply On ${message.subject}`, emailText);
        }
    }

    return res.json({ //Send JSON response to front-end
        success: `Replied to ${message._id}`,
        message: message
    });
};

// Inbox DELETE messages
module.exports.delete = async function(req, res) {
    let ids = [];
    for(const id in req.body) {
        ids.push(id);
    }

    const messages = await Message.find({_id: {$in: ids}});
    if(!messages) {req.flash('error', 'Could not find messages'); return res.redirect('back');}

    messages.forEach( message => {
        if(req.user.inbox.includes(message._id)) {
            req.user.inbox.splice(index, 1);
            if(!message.read.includes(req.user._id)) {
                req.user.msgCount -= 1;
            }
        }
    });
    await req.user.save();

    return res.redirect('back');
};

// ==========================================
// Access Request Routes

module.exports.showReq = async function(req, res) {
    const request = await AccessReq.findById(req.params.id)
    .populate({path: 'requester', select: 'username'})
    .populate({path: 'room', select: ['creator', 'name']}).exec();
    if(!request) {req.flash('error', 'Unable to access Database.'); return res.redirect('back');}

    return res.render('inbox/requests/show', {request});
};

module.exports.acceptReq = async function(req, res) {
    const Req = await AccessReq.findById(req.params.id)
    .populate({path: 'room', select: ['creator']}).populate('requester').exec();

    if(!Req) {
        req.flash("error", "Unable to access database");
        return res.redirect('back');

    } else if(!Req.room.creator.id.equals(req.user._id)) {
        req.flash("error", "You do not have permission to do that");
        return res.redirect('back');

    } else if(Req.status != 'pending') {
        req.flash('error', 'Request already handled');
        return res.redirect('back');

    }

    const room = await Room.findById(Req.room._id);
    if(!room) { req.flash("error", "Unable to access database");return res.redirect('back'); }

    room.members.push(Req.requester);
    Req.status = 'accepted';
    await room.save();
    await Req.save();

    if(Req.requester.receiving_emails) {
        const emailText = `<p>Hello ${Req.requester.firstName},</p><p>Your request to join chat room <strong>${foundRoom.name}</strong> has been accepted!<p><p>You can access the room at https://alsion-saberchat.herokuapp.com</p>`;

        await sendGridEmail(Req.requester.email, `Room Request Accepted - ${foundRoom.name}`, emailText);
    }

    req.flash('success', 'Request accepted');
    return res.redirect('/inbox');
};

module.exports.rejectReq = async function(req, res) {
    const Req = await AccessReq.findById(req.params.id)
    .populate('room').populate('requester').exec();

    if(!Req) {
        req.flash("error", "Unable to access database");
        return res.redirect('back');

    } else if(!Req.room.creator.id.equals(req.user._id)) {
        req.flash("error", "You do not have permission to do that");
        return res.redirect('back');

    } else if(Req.status != 'pending') {
        req.flash('error', 'Request already handled');
        return res.redirect('back');

    }
    Req.status = 'rejected';
    await Req.save();

    if(Req.requester.receiving_emails) {
        const emailText = `<p>Hello ${Req.requester.firstName},</p><p>Your request to join chat room <strong>${Req.room.name}</strong> has been rejected. Contact the room creator, <strong>${Req.room.creator.username}</strong>, if you think that there has been a mistake.</p>`;

        await sendGridEmail(Req.requester.email, `Room Request Rejected - ${Req.room.name}`, emailText);
    }

    req.flash('success', 'Request rejected');
    return res.redirect('/inbox');
};
