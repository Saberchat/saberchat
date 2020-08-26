const express = require('express');
const middleware = require('../middleware');
//start express router
const router = express.Router();


const User = require('../models/user');
const Notification = require('../models/notification');

//Access sendNotification file
router.get('/notif', middleware.isLoggedIn, (req, res, next) => {
	let types = ["Cafe Order Status Update", "Field Trip Notification", "PE Notification", "School Event Notification", "Class Schedule Change"]
	User.find({}, (err, foundUsers) => {
		if(err || !foundUsers) {
			req.flash('error', 'Unable to access Database');
			res.redirect('back');
		} else {
			res.render('inbox/sendNotification', {users: foundUsers, types})
		}
	})
})

//Route to send 'notification', different from 'comment'
router.post('/new', middleware.isLoggedIn, (req, res) => {
	let recipient = req.body.recipient
	User.find({}, (err, foundUsers) => {
		if(err || !foundUsers) {
			req.flash('error', 'Unable to access Database');
			res.redirect('back');
		} else {
			for (let i of foundUsers) {
				if (i.username.toLowerCase() == recipient.toLowerCase()) {
					Notification.create({type: req.body.type, sender: req.user, text: req.body.message}, (err, notification) => {
						notification.save()
						i.inbox.push(notification)
						i.save()
						req.flash('success', "Notification sent!")
						res.redirect('/notif')
					})
				}
			}
		}
	})
})

//Route to display user inbox
router.get('/inbox', middleware.isLoggedIn, (req, res, next) => {
	let notifList = []
	Notification.find({

	}).populate({path: 'sender', select: ['username']})
	.exec((err, foundNotifs) => {
		if (err || !foundNotifs) {
			req.flash('error', 'Unable to access Database');
				res.redirect('back')

		} else {
			for (let notif of foundNotifs) {
				if (req.user.inbox.indexOf(notif['_id']) > -1) {
					notifList.push(notif)
				}
			}
			res.render('inbox/inbox', {username: req.user.username, notifs: notifList})
		}
	})
})

module.exports = router;
