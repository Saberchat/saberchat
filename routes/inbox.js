const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const User = require('../models/user');
const Notification = require('../models/notification');

//Access sendNotification file
router.get('/notif', middleware.isLoggedIn, (req, res) => {
	let types = ["Cafe Order Status Update", "Field Trip Notification", "PE Notification", "School Event Notification", "Class Schedule Change"] //Types of notifs
	User.find({}, (err, foundUsers) => {
		if(err || !foundUsers) {
			req.flash('error', 'Unable to access Database');
			res.redirect('back');

		} else {
			let mailingList = foundUsers; //Temporary list of users - operations will be performed on it, we don't want to modify the actual users
			for (let user of foundUsers) {
				if (user.username == req.user.username) {
					mailingList.splice(foundUsers.indexOf(user), 1) //Removes current user from mailing list
					break;
				}
			}
			res.render('inbox/sendNotification', {users: mailingList, types, selected_users: []})
		}
	})
})

//Route to send notification to everyone
// router.post('/send_all', middleware.isLoggedIn, (req, res) => {
// 	User.find({}, (err, foundUsers) => {
// 		if(err || !foundUsers) {
// 			req.flash('error', 'Unable to access Database');
// 			res.redirect('back');
//
// 		} else {
// 			for (let i of foundUsers) {
// 				if (i.username != req.user.username) { //Removes current user from mailing list
// 					Notification.create({type: req.body.type, sender: req.user, text: req.body.message}, (err, notification) => {
// 						notification.save()
// 						i.inbox.push(notification) //Add notif to recipient's inbox
// 						i.save()
// 					})
// 				}
// 			}
// 			req.flash('success', `Notification sent to everyone!`)
// 			res.redirect('/notif')
// 		}
// 	})
// })

//Route to send notification to a group of people
router.post('/send_group', middleware.isLoggedIn, (req, res) => {
	let mailing_list = req.body.recipient_list.split(', ') //Creates list of recipients based on user input
	User.find({}, (err, foundUsers) => { //Access users from User schema
		if(err || !foundUsers) {
			req.flash('error', 'Unable to access Database');
			res.redirect('back');

		} else {
			for (let i of foundUsers) {
				if (mailing_list.includes(i.username)) { //Only users who are in mailing_list
					Notification.create({type: req.body.type, sender: req.user, text: req.body.message}, (err, notification) => {
						notification.save()
						i.inbox.push(notification) //Add notif to each recipient's inbox
						i.save()
					})
				}
			}
		}
		req.flash('success', `Notification sent to mailing list!!`)
		res.redirect('/notif')
	})
})

//Route to send a notification to 1 person
router.post('/send_individual', middleware.isLoggedIn, (req, res) => {

	if (req.body.recipient == 'everyone') {

		User.find({}, (err, foundUsers) => {
			if(err || !foundUsers) {
				req.flash('error', 'Unable to access Database');
				res.redirect('back');

			} else {
				for (let i of foundUsers) {
					if (i.username != req.user.username) { //Removes current user from mailing list
						Notification.create({type: req.body.type, sender: req.user, text: req.body.message}, (err, notification) => {
							notification.save()
							i.inbox.push(notification) //Add notif to recipient's inbox
							i.save()
						})
					}
				}
				req.flash('success', `Notification sent to everyone!`)
				res.redirect('/notif')
			}
		})

	} else {

		User.find({}, (err, foundUsers) => { //Access users from User schema
			if(err || !foundUsers) {
				req.flash('error', 'Unable to access Database');
				res.redirect('back');

			} else {
				for (let i of foundUsers) {
					if (i.username == req.body.recipient) {
						Notification.create({type: req.body.type, sender: req.user, text: req.body.message}, (err, notification) => {
							notification.save()
							i.inbox.push(notification) //Add notif to recipient's inbox
							i.save()
						})
					}
				}
				req.flash('success', `Notification sent to ${req.body.recipient}!`)
				res.redirect('/notif')
			}
		})
	}
})

//Route to display user inbox
router.get('/inbox', middleware.isLoggedIn, (req, res) => {
	User.find({

	}).populate({
		path: 'inbox',
		populate: { path: 'sender', select: ['username', 'imageUrl']}
	})

	.exec((err, foundUsers) => {
		for (let user of foundUsers) {
			if (user.username == req.user.username) {
				res.render('inbox/inbox', {username: req.user.username, notifs: user.inbox.reverse()})
			}
		}
	})
})

//Delete already viewed notifications
router.post('/delete', (req, res) => {
	deletes = [] //List of messages to be deleted
	for (let item of req.user.inbox) {
		if (Object.keys(req.body).includes(item._id.toString())) { //If item is selected to be deleted (checkbox)
			deletes.push(item)
		}
	}

	for (let notif of deletes) {
		Notification.findByIdAndDelete(notif, (err, deletedNotif) => { //Delete based on the notification's id
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
