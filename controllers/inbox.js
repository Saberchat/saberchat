const dateFormat = require('dateformat');
const Filter = require('bad-words');
const filter = new Filter();
const {transport, transport_mandatory} = require("../utils/transport");
const convertToLink = require("../utils/convert-to-link");

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

	let activeRequests = [];
	for (let request of req.user.requests) {
		if (request.status == "pending") {
			activeRequests.push(request);
		}
	}

	res.render('inbox/index', {inbox: req.user.inbox.reverse(), requests: req.user.requests.reverse(), activeRequests});
};

// Inbox GET show message
module.exports.show = async function(req, res) {
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

    const convertedText = convertToLink(message.text);
    res.render('inbox/show', {message: message, convertedText});
};

// Inbox GET new message form
module.exports.newMsgForm = async function(req, res) {
    const users = await User.find({authenticated: true});
	if(!users) { req.flash('error', 'Unable to access Database.'); return res.redirect('back'); }
	res.render('inbox/new', {users: users});
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

    res.render('inbox/index_sent', {inbox: sent_msgs.reverse()});
};

// Inbox POST create messsage
module.exports.createMsg = async function(req, res) {
    let message = {
        subject: filter.clean(req.body.subject),
        text: filter.clean(req.body.message)
    };

    if(req.body.images) {
        message.images = req.body.images;
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

    let inboxEmail;

    const recipientList = await User.find({authenticated: true, _id: { $in: recipients}});

    let imageString = "";

    for (let image of newMessage.images) {
    imageString += `<img src="${image}">`;
    }

    let recipientArr = [];

        for (let r of recipientList) {
    recipientArr = [];

    for (let rec of recipientList) {
        if (rec._id.equals(r._id)) {
        recipientArr.push('me');

        } else {
        recipientArr.push(rec.username);
        }
    }

    if (message.toEveryone) {
        transport(r, `New Inbox Notification - ${newMessage.subject}`, `<p>Hello ${r.firstName},</p><p>You have a new Saberchat inbox notification from <strong>${req.user.username}</strong>!</p><p><strong>To</strong>: Everyone</p><p>${newMessage.text}</p><p>You can access the full message at https://alsion-saberchat.herokuapp.com</p> ${imageString}`);

    } else if (message.anonymous) {
        transport(r, `New Inbox Notification - ${newMessage.subject}`, `<p>Hello ${r.firstName},</p><p>You have a new Saberchat anonymous notification!</p><p><strong>To</strong>: ${recipientArr.join(', ')}</p><p>${newMessage.text}</p><p>You can access the full message at https://alsion-saberchat.herokuapp.com</p> ${imageString}`);

    } else {
        transport(r, `New Inbox Notification - ${newMessage.subject}`, `<p>Hello ${r.firstName},</p><p>You have a new Saberchat inbox notification from <strong>${req.user.username}</strong>!</p><p><strong>To</strong>: ${recipientArr.join(', ')}</p><p>${newMessage.text}</p><p>You can access the full message at https://alsion-saberchat.herokuapp.com</p> ${imageString}`);
    }

    }

    req.flash('success', 'Message sent');
    res.redirect(`/inbox/${newMessage._id}`);
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
    res.redirect('back');
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
    res.redirect('back');
};

// Inbox DELETE clear inbox
module.exports.clear = function(req, res) {
    req.user.inbox = [];
	req.user.msgCount = 0;
	req.user.save();
	req.flash('success', 'Inbox cleared!');
	res.redirect('/inbox');
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
        const index = req.user.inbox.indexOf(message._id);
        if(index > -1) {
            req.user.inbox.splice(index, 1);
            if(!message.read.includes(req.user._id)) {
                req.user.msgCount -= 1;
            }
        }
    });
    await req.user.save();

    res.redirect('back');
};