const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat');
const Filter = require('bad-words');
const filter = new Filter();
const {transport, transport_mandatory} = require("../other_modules/transport");
const convertToLink = require("../other_modules/convert-to-link");
const { validateMsg } = require('../middleware/validation');

const User = require('../models/user');
const Message = require('../models/message');
const AccessReq = require('../models/accessRequest');
const Room = require('../models/room');

//Route to display user inbox
router.get('/', middleware.isLoggedIn, (req, res) => {
	(async () => {

		await req.user.populate({path: 'inbox', populate: { path: 'sender', select: ['username', 'imageUrl']}}).execPopulate();

		await req.user.populate(
			{
				path: 'requests',
				populate: [
					{ path: 'requester', select: ['username', 'imageUrl']},
					{ path: 'room', select: 'name'}
				]
			}).execPopulate();

		res.render('inbox/index', {inbox: req.user.inbox.reverse(), requests: req.user.requests.reverse()});

	})().catch(err => {
		req.flash('error', 'An error occured');
		res.redirect('back');
	});
});


//Access sendNotification file
router.get('/messages/new', middleware.isLoggedIn, (req, res) => {
	User.find({authenticated: true}, (err, foundUsers) => {
		if(err || !foundUsers) {
			req.flash('error', 'Unable to access Database');
			res.redirect('back');

		} else {
			res.render('inbox/new', {users: foundUsers});
		}
	});
});

//Route to send notification to a group of people
router.post('/messages', middleware.isLoggedIn, validateMsg, (req, res) => {
	(async () => {
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

	})().catch(err => {
		req.flash('error', 'An error occured');
		res.redirect('back');
	});
});

//Accesses every notification that you have sent
router.get('/sent', middleware.isLoggedIn, (req, res) => {

  Message.find({}, (err, messages) => {
    if (err || !messages) {
      req.flash('error', 'Unable to access database');
      res.redirect('/inbox');

    } else {
      let sent_inbox = []; //Inbox of all messages user has sent

      for (let message of messages) {

        //If this user sent the message
        if (message.sender.equals(req.user._id))  {
          sent_inbox.push(message)

        } else {
          //Check to see if this user has replied to any of the messages
          for (let reply of message.replies.reverse()) { //Get most  recent reply by reversing replies
            if (reply.sender.equals(req.user._id)) {
              sent_inbox.push(message);
              break;
            }
          }
        }
      }

      res.render('inbox/index_sent', {inbox: sent_inbox.reverse()});
    }
  });
});

//User can reply to notifications sent to them
router.put('/reply', middleware.isLoggedIn, (req, res) => {
  Message.findById(req.body.message).populate('recipients').populate('sender').exec((err, message) => {
    if (err || !message) {
      res.json({error: "Error accessing message"});

    } else if (message.anonymous || message.noReply) {
      res.json({error: "Cannot reply to this message"});

    } else {
      let reply = {sender: req.user, text: req.body.text, images: req.body.images, date: dateFormat(new Date(), "h:MM TT | mmm d")};
      message.replies.push(reply); //Add reply to message thread

      let replyEmail;

      //Create string to track reply's images
      let imageString = "";

      if (reply.images) {
        for (let image of reply.images) {
          imageString += `<img src="${image}">`;
        }
      }

      let readRecipients = message.read; //Users who have read the original message will need to have their msgCount incremented again

      //Iterates through the recipients and sees if the sender is part of them. If not, then no reply has been sent yet, but since the sender has sent the message, they have 'read' it. Hence, they are added to the readRecipients array.

      senderIncluded = false; //Checks whether the sender is part of the thread
      for (let recipient of message.recipients) {
        if (recipient._id.equals(message.sender._id)) {
          senderIncluded = true;
          break;
        }
      }

      if (!senderIncluded) {
        readRecipients.push(message.sender);
      }

      for (let i = message.recipients.length-1; i >= 0; i--) { //If the original sender is already part of the recipients, remove them just in case
        if (message.recipients[i]._id.equals(message.sender._id)) {
          message.recipients.splice(i, 1);
        }
      }

      message.recipients.push(message.sender); //Add original sender to recipient list (code above ensures that they are not added multiple times)
      message.read = [req.user]; //Since the current user replied to this message, they've seen the completely updated message. Nobody else has
      message.save();

      for (let recipient of message.recipients) { //Remove original message and add it back so that it appears 'new'

        //Remove message from recipient's inbox
        for (let i = recipient.inbox.length - 1; i >= 0; i --) {
          if (recipient.inbox[i].equals(message._id)) {
            recipient.inbox.splice(i, 1);
          }
        }

        //Add it to the front of the recipient's inbox
        recipient.inbox.push(message._id);

        //If the recipient has already read this message and it is not the person sending the reply (or the recipient is the original message sender), increment their message count again
        if ((readRecipients.includes(recipient._id)) && (!(recipient._id.equals(req.user._id)))) {
          recipient.msgCount += 1;
        }

        recipient.save();

        //Send email notifying about the reply to everyone except person who posted the reply
        if (!(recipient._id.equals(req.user._id))) {
          transport(recipient, `New Reply On ${message.subject}`, `<p>Hello ${recipient.firstName},</p><p><strong>${req.user.username}</strong> replied to <strong>${message.subject}</strong>.<p>${reply.text}</p><p>You can access the full message at https://alsion-saberchat.herokuapp.com</p> ${imageString}`);
        }
      }

      res.json({ //Send JSON response to front-end
        success: `Replied to ${message._id}`,
        message: message
      });
    }
  });
});

// Message show route
router.get('/:id', middleware.isLoggedIn, (req, res) => {
	( async () => {
		const message = await Message.findById(req.params.id);
		if(!message) {
      req.flash('error','Cannot find message'); return res.redirect('back');
    }

		if(!message.toEveryone && !message.recipients.includes(req.user._id) && !message.sender.equals(req.user._id)) {
			req.flash('error', 'You do not have permission to view this message');
			return res.redirect('back');
		}

		if((!message.read.includes(req.user._id)) && (message.recipients.includes(req.user._id))) {
			req.user.msgCount -= 1;
			message.read.push(req.user._id);
			await req.user.save();
			await message.save();
		}

		await message.populate({path: 'sender', select: 'username'}).populate({path:'recipients', select: 'username'}).populate({path: 'read', select: 'username'}).populate({path: 'replies.sender'}).execPopulate();

		const convertedText = convertToLink(message.text);
		res.render('inbox/show', {message: message, convertedText});

  })().catch(err => {
		req.flash('error','There was an error');
		res.redirect('back');
	});
});


//Clear entire inbox
router.delete('/clear', middleware.isLoggedIn, (req, res) => {
	req.user.inbox = [];
	req.user.msgCount = 0;
	req.user.save();
	req.flash('success', 'Inbox cleared!');
	res.redirect('/inbox');
});

//Delete messages
router.delete('/delete', middleware.isLoggedIn, (req, res) => {
	( async ()=> {
		let ids = [];
		for(const id in req.body) {
			ids.push(id);
		}

		const messages = await Message.find({_id: {$in: ids}});
		if(!messages) {req.flash('error', 'Could not find messages'); return res.redirect('back');}

		let nUnread = 0;
		messages.forEach( message => {
			const i = req.user.inbox.indexOf(message._id);
			if(i > -1) {
				req.user.inbox.splice(i, 1);
				if(!message.read.includes(req.user._id)) {
					nUnread ++;
				}
			}
		});
		req.user.msgCount -= nUnread;
		await req.user.save();

		res.redirect('back');
	})().catch(err => {
		req.flash('error', 'An error occured');
		res.redirect('back');
	});
});

router.put('/mark-all', middleware.isLoggedIn, (req, res) => {
	Message.updateMany({_id: {$in: req.user.inbox}, read: {$ne: req.user._id}}, {$push: {read: req.user._id}}, (err, result) => {
		if(err) {
			req.flash('error','Could not mark as read');
			res.redirect('back');
		} else {
			req.user.msgCount -= result.nModified;
			req.user.save();
			req.flash('success', 'Marked all as read');
			res.redirect('back');
		}
	});
});

router.put('/mark-selected', middleware.isLoggedIn, (req, res) => {
	let ids = [];
	for(const id in req.body) {
		ids.push(id);
	}
	Message.updateMany({_id: {$in: ids}, read: {$ne: req.user._id}}, {$push: {read: req.user._id}}, (err, result) => {
		if(err) {
			req.flash('error','Could not mark as read');
			res.redirect('back');

		} else {
			req.user.msgCount -= result.nModified;
			req.user.save();
			req.flash('success', 'Marked as read');
			res.redirect('back');
		}
	});
});

// ========================================
// access request routes
// ========================================

// displays single access request
router.get('/requests/:id', middleware.isLoggedIn, (req, res) => {
	AccessReq.findById(req.params.id)
	.populate({path: 'requester', select: 'username'})
	.populate({path: 'room', select: ['creator', 'name']}).exec((err, foundReq) => {
		if(err || !foundReq) {
			req.flash("error", "Unable to access database");
			res.redirect('back');
		} else {
			res.render('inbox/requests/show', {request: foundReq});
		}
	});
});

// route to accept request
router.post('/requests/:id/accept', middleware.isLoggedIn, (req, res) => {
	(async () =>  {
		const Req = await AccessReq.findById(req.params.id)
		.populate({path: 'room', select: ['creator']}).populate('requester');

		if(!Req) {
			req.flash("error", "Unable to access database");
			return res.redirect('back');

		} else if(!Req.room.creator.id.equals(req.user._id)) {
			req.flash("error", "You do not have permission to do that");
			return res.redirect('back');

		} else if(Req.status != 'pending') {
			req.flash('error', 'Request already handled');
			return res.redirect('back');

		} else {

			const foundRoom = await Room.findById(Req.room._id);

			if(!foundRoom) {
        req.flash("error", "Unable to access database");return res.redirect('back');
      }

			foundRoom.members.push(Req.requester);
			Req.status = 'accepted';

			await foundRoom.save();
			await Req.save();

      let index = -1;
      for (let i = 0; i < req.user.requests.length; i ++) {
        if (req.user.requests[i].equals(Req._id)) {
          index = i;
        }
      }

      if (index != -1) {
        req.user.requests.splice(index, 1);
        await req.user.save();
      }

      transport(Req.requester, `Room Request Accepted - ${foundRoom.name}`, `<p>Hello ${Req.requester.firstName},</p><p>Your request to join chat room <strong>${foundRoom.name}</strong> has been accepted!<p><p>You can access the room at https://alsion-saberchat.herokuapp.com</p>`);
			req.flash('success', 'Request accepted');
			res.redirect('/inbox');
		}

	})().catch(err => {
		req.flash("error", "Unable to access database");
		res.redirect('back');
	});
});

// route to reject request
router.post('/requests/:id/reject', middleware.isLoggedIn, (req, res) => {
	( async () => {
		const Req = await AccessReq.findById(req.params.id)
		.populate('room').populate('requester')

		if(!Req) {
			req.flash("error", "Unable to access database");
			return res.redirect('back');

		} else if(!Req.room.creator.id.equals(req.user._id)) {
			req.flash("error", "You do not have permission to do that");
			return res.redirect('back');

		} else if(Req.status != 'pending') {
			req.flash('error', 'Request already handled');
			return res.redirect('back');

		} else {

			Req.status = 'rejected';

			await Req.save();

      let index = -1;
      for (let i = 0; i < req.user.requests.length; i ++) {
        if (req.user.requests[i].equals(Req._id)) {
          index = i;
        }
      }

      if (index != -1) {
        req.user.requests.splice(index, 1);
        await req.user.save();
      }

      transport(Req.requester, `Room Request Rejected - ${Req.room.name}`, `<p>Hello ${Req.requester.firstName},</p><p>Your request to join chat room <strong>${Req.room.name}</strong> has been rejected. Contact the room creator, <strong>${Req.room.creator.username}</strong>, if  you think there has been a mistake.</p>`);
			req.flash('success', 'Request rejected');
			res.redirect('/inbox');
		}

	})().catch(err => {
		req.flash("error", "Unable to access database");
		res.redirect('back');
	});
});

module.exports = router;
