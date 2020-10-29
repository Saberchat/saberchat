const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat');
const Filter = require('bad-words');
const filter = new Filter();

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
		console.log(err);
		req.flash('error', 'An error occured');
		res.redirect('back');
	});
});


//Access sendNotification file
router.get('/messages/new', middleware.isLoggedIn, (req, res) => {
	User.find({}, (err, foundUsers) => {
		if(err || !foundUsers) {
			req.flash('error', 'Unable to access Database');
			res.redirect('back');

		} else {
			res.render('inbox/new', {users: foundUsers});
		}
	})
})

//Route to send notification to a group of people
router.post('/messages', middleware.isLoggedIn, (req, res) => {
	( async () => {
		let message = {
			subject: filter.clean(req.body.subject),
			text: filter.clean(req.body.message)
		}

		if(req.body.images) {
			message.images = req.body.images;
		}
		message.sender = req.user._id;

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
			const faculty = await User.find({status: 'faculty', _id: { $in: recipients } });

			if(!faculty) {req.flash('error', 'An error occured'); return res.redirect('back');}
			if(!faculty.length > 0) {req.flash('error', 'You can only select faculty'); return res.redirect('back');}

			recipients = [];
			faculty.forEach(user => {
				recipients.push(user._id);
			});

			message.anonymous = true;
			delete message.sender;
		}

		message.recipients = recipients;

		const newMessage = await Message.create(message);
		if(!newMessage) {req.flash('error', 'Message could not be created'); return res.redirect('back');}

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

		req.flash('success', 'Message sent');
		res.redirect('back');

	})().catch(err => {
		console.log(err);
		req.flash('error', 'An error occured');
		res.redirect('back');
	});
});

//Accesses every notification that you have sent
router.get('/sent', middleware.isLoggedIn, (req, res) => {
	Message.find({sender: req.user._id}, (err, foundMsg) => {
		if (err || !foundMsg) {
			req.flash('error', 'Unable to access database')
			res.redirect('/inbox')

		} else {
			res.render('inbox/index_sent', {inbox: foundMsg.reverse()})
		}
	})
})

// Message show route
router.get('/:id', middleware.isLoggedIn, (req, res) => {
	( async ()=> {
		const message = await Message.findById(req.params.id);
		if(!message) {req.flash('error','Cannot find message'); return res.redirect('back');}

		if(!message.toEveryone && !message.recipients.includes(req.user._id) && !message.sender.equals(req.user._id)) {
			req.flash('error', 'You do not have permission to view this message');
			return res.redirect('back');
		}

		if(!message.read.includes(req.user._id)) {
			req.user.msgCount -= 1;
			message.read.push(req.user._id);
			await req.user.save();
			await message.save();
		}

		await message.populate({path: 'sender', select: 'username'}).populate({path:'recipients', select: 'username'}).execPopulate();

		res.render('inbox/show', {message: message});
	})().catch(err => {
		console.log(err);
		req.flash('error','There was an error');
		res.redirect('back');
	});
});


//Clear entire inbox
router.delete('/clear', middleware.isLoggedIn, (req, res) => {
	req.user.inbox = []
	req.user.msgCount = 0;
	req.user.save();
	req.flash('success', 'Inbox cleared!');
	res.redirect('/inbox');
})

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
		console.log(err);
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
	( async function() {
		const Req = await AccessReq.findById(req.params.id)
		.populate({path: 'room', select: ['creator']});

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

			if(!foundRoom) {req.flash("error", "Unable to access database");return res.redirect('back');}

			foundRoom.members.push(Req.requester);
			Req.status = 'accepted';

			await foundRoom.save();
			await Req.save();

			req.flash('success', 'Request accepted');
			res.redirect('/inbox');
		}
	})().catch(err => {
		console.log(err);
		req.flash("error", "Unable to access database");
		res.redirect('back');
	});
});

// route to reject request
router.post('/requests/:id/reject', middleware.isLoggedIn, (req, res) => {
	( async function() {
		const Req = await AccessReq.findById(req.params.id)
		.populate({path: 'room', select: ['creator']});

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

			req.flash('success', 'Request rejected');
			res.redirect('/inbox');
		}
	})().catch(err => {
		console.log(err);
		req.flash("error", "Unable to access database");
		res.redirect('back');
	});
});

module.exports = router;
