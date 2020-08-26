const express = require('express');
const middleware = require('../middleware');
//start express router
const router = express.Router();


const User = require('../models/user');
const Notification = require('../models/notification');

//Access sendNotification file
router.get('/notif', middleware.isLoggedIn, (req, res, next) => {
	let types = ["Cafe Order Status Update", "Field Trip Notification", "PE Notification", "School Event Notification", "Class Schedule Change"] //Types of notifs
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
	//Access recipient from User schema
	User.find({}, (err, foundUsers) => {
		if(err || !foundUsers) {
			req.flash('error', 'Unable to access Database');
			res.redirect('back');
		} else {
			for (let i of foundUsers) {
				if (i.username.toLowerCase() == req.body.recipient.toLowerCase()) {
					//Create notification and save it to database
					Notification.create({type: req.body.type, sender: req.user, text: req.body.message}, (err, notification) => {
						notification.save()
						i.inbox.push(notification) //Add notif to recipient's inbox
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

	//Collect all notifications, collect info on sender's username
	let notifList = [] //List of notifications that will be displayed
	Notification.find({

	}).populate({path: 'sender', select: ['username', 'imageUrl']})
	.exec((err, foundNotifs) => {
		if (err || !foundNotifs) {
			req.flash('error', 'Unable to access Database');
				res.redirect('back')

		} else { //If user's inbox contains notification's id, add to notifList []
			for (let notif of foundNotifs) {
				if (req.user.inbox.includes(notif['_id'])) {
					notifList.unshift(notif)
				}
			}
			res.render('inbox/inbox', {username: req.user.username, notifs: notifList})
		}
	})
})

//Delete already viewed notifications
router.post('/delete', (req, res) => {
	deletes = []
	for (let item of req.user.inbox) {
		if (Object.keys(req.body).includes(item._id.toString())) {
			deletes.push(item)
		}
	}

	for (let msg of deletes) {
		Notification.findByIdAndDelete(msg, (err, deletedNotif) => {
			if (err || !deletedNotif) {
				console.log(err)
				req.flash('error', 'A Problem Occured, Unable to Delete');
	      res.redirect('back');
			}
		})
	}
	req.flash('success', 'Notification(s) deleted!');
	res.redirect('/inbox');
})

module.exports = router;
