const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat');
const Filter = require('bad-words');
const filter = new Filter();
const {transport, transport_mandatory} = require("../utils/transport");
const convertToLink = require("../utils/convert-to-link");
const { validateMsg } = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');

const User = require('../models/user');
const Message = require('../models/message');
const AccessReq = require('../models/accessRequest');
const Room = require('../models/room');

// controller
const inbox = require('../controllers/inbox');

// Display user inbox
router.get('/', middleware.isLoggedIn, wrapAsync(inbox.index));

// Message show route
router.get('/:id', middleware.isLoggedIn, wrapAsync(inbox.show));

// New messsage form
router.get('/messages/new', middleware.isLoggedIn, wrapAsync(inbox.newMsgForm));

// Display sent messages
router.get('/sent', middleware.isLoggedIn, wrapAsync(inbox.sent));

// Create messsage
router.post('/messages', middleware.isLoggedIn, validateMsg, wrapAsync(inbox.createMsg));

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

// Mark all messages as read
router.put('/mark-all', middleware.isLoggedIn, wrapAsync(inbox.markReadAll));

// Mark selected messages as read
router.put('/mark-selected', middleware.isLoggedIn, wrapAsync(inbox.markReadSelected));

// Clear entire inbox
router.delete('/clear', middleware.isLoggedIn, inbox.clear);

// Delete messages
router.delete('/delete', middleware.isLoggedIn, wrapAsync(inbox.delete));


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
			if(!foundRoom) { req.flash("error", "Unable to access database");return res.redirect('back'); }
			foundRoom.members.push(Req.requester);
			Req.status = 'accepted';
			await foundRoom.save();
			await Req.save();

      		transport(Req.requester, `Room Request Accepted - ${foundRoom.name}`, `<p>Hello ${Req.requester.firstName},</p><p>Your request to join chat room <strong>${foundRoom.name}</strong> has been accepted!<p><p>You can access the room at https://alsion-saberchat.herokuapp.com</p>`);
			req.flash('success', 'Request accepted');
			return res.redirect('/inbox');
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

      		transport(Req.requester, `Room Request Rejected - ${Req.room.name}`, `<p>Hello ${Req.requester.firstName},</p><p>Your request to join chat room <strong>${Req.room.name}</strong> has been rejected. Contact the room creator, <strong>${Req.room.creator.username}</strong>, if  you think there has been a mistake.</p>`);
			req.flash('success', 'Request rejected');
			return res.redirect('/inbox');
		}

	})().catch(err => {
		req.flash("error", "Unable to access database");
		res.redirect('back');
	});
});

module.exports = router;
