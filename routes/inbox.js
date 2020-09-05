const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const User = require('../models/user');
const Notification = require('../models/notification');
const Announcement = require('../models/announcement');

//Access sendNotification file
router.get('/notif', middleware.isLoggedIn, (req, res) => {
	User.find({}, (err, foundUsers) => {
		if(err || !foundUsers) {
			req.flash('error', 'Unable to access Database');
			res.redirect('back');

		} else {

			Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
				if (err || !foundAnns) {
					req.flash('error', 'Unable to access database')
					res.redirect('back')
				} else {
					res.render('inbox/sendNotification', {announcements: foundAnns, announced: false, users: foundUsers, selected_users: [], currentUser: req.user})
				}
			})
		}
	})
})

//Route to send notification to a group of people
router.post('/send_group', middleware.isLoggedIn, (req, res) => {
	let mailing_list = req.body.recipient_list.split(', ') //Creates list of recipients based on user input

	if (mailing_list.includes('everyone')) {
		User.find({'_id': {$nin: req.user._id}}, (err, foundUsers) => {
			if(err || !foundUsers) {
				req.flash('error', 'Unable to access Database');
				res.redirect('back');

			} else {
				for (let i of foundUsers) {
					if (req.body.images.split(', ')[0] == '') {
						Notification.create({subject: req.body.subject, sender: req.user, text: req.body.message, recipients: ['everyone'], images: []}, (err, notification) => {
							notification.save()
							i.inbox.push(notification) //Add notif to recipient's inbox
							i.save()
						})

					} else {
						Notification.create({subject: req.body.subject, sender: req.user, text: req.body.message, recipients: ['everyone'], images: req.body.images.split(', ')}, (err, notification) => {
							notification.save()
							i.inbox.push(notification) //Add notif to recipient's inbox
							i.save()
						})
					}
				}
			}
			req.flash('success', `Notification sent to everyone!`)
			res.redirect('/notif')
		})

	} else {

		User.find({'username': {$in: mailing_list}}, (err, foundUsers) => { //Access users from User schema
			if(err || !foundUsers) {
				req.flash('error', 'Unable to access Database');
				res.redirect('back');

			} else {
				for (let i of foundUsers) {
					if (req.body.images.split(', ')[0] == '') {
						Notification.create({subject: req.body.subject, sender: req.user, text: req.body.message, recipients: mailing_list, images: []}, (err, notification) => {
							notification.save()
							i.inbox.push(notification) //Add notif to each recipient's inbox
							i.save()
						})

					} else {
						Notification.create({subject: req.body.subject, sender: req.user, text: req.body.message, recipients: mailing_list, images: req.body.images.split(', ')}, (err, notification) => {
							notification.save()
							i.inbox.push(notification) //Add notif to each recipient's inbox
							i.save()
						})
					}
					req.flash('success', `Notification sent to mailing list!!`)
					res.redirect('/notif')
				}
			}
		})
	}
})

router.post('/send_anonymous', (req, res) => {
	let mailing_list = req.body.recipient_list_anonymous.split(', ') //Creates list of recipients based on user input

	if (mailing_list.includes('All Teachers and Admins')) {
		User.find({'permission': {$in: ['teacher', 'admin']}}, (err, foundUsers) => {
			if(err || !foundUsers) {
				req.flash('error', 'Unable to access Database');
				res.redirect('back');

			} else {
				for (let i of foundUsers) {

					if (req.body.images.split(', ')[0] == '') {
						Notification.create({subject: req.body.subject, sender: null, text: req.body.message, recipients: ['All teachers and admins'], images: []}, (err, notification) => {
							notification.save()
							i.inbox.push(notification) //Add notif to recipient's inbox
							i.save()
						})

					} else {
						Notification.create({subject: req.body.subject, sender: null, text: req.body.message, recipients: ['All teachers and admins'], images: req.body.images.split(', ')}, (err, notification) => {
							notification.save()
							i.inbox.push(notification) //Add notif to recipient's inbox
							i.save()
						})
					}
				}
			}
			req.flash('success', `Notification sent to all teachers! Your identity has been kept anonymous`)
			res.redirect('/notif')
		})

	} else {

		User.find({username: {$in: mailing_list}}, (err, foundUsers) => { //Access users from User schema
			if(err || !foundUsers) {
				req.flash('error', 'Unable to access Database');
				res.redirect('back');

			} else {

				for (let i of foundUsers) {
					if (req.body.images.split(', ')[0] == '') {
						Notification.create({subject: req.body.subject, sender: null, text: req.body.message, recipients: mailing_list, images: []}, (err, notification) => {
							notification.save()
							i.inbox.push(notification) //Add notif to recipient's
							i.save()
						})

					} else {
						Notification.create({subject: req.body.subject, sender: null, text: req.body.message, recipients: mailing_list, images: req.body.images.split(', ')}, (err, notification) => {
							notification.save()
							i.inbox.push(notification) //Add notif to recipient's
							i.save()
						})
					}
				}

				req.flash('success', `Notification sent to mailing list! Your identity has been kept anonymous`)
				res.redirect('/notif')
			}
		})
	}
})

//Route to display user inbox
router.get('/inbox', middleware.isLoggedIn, (req, res) => {

	User.findOne({_id: req.user._id}).populate({path: 'inbox', populate: { path: 'sender', select: ['username', 'imageUrl']}}).exec((err, foundUser) => {
		if (err || !foundUser) {
      req.flash('error', 'Unable to access database')
      res.redirect('back')

    } else {
			Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
				if (err || !foundAnns) {
					req.flash('error', 'Unable to access database')
					res.redirect('back')
				} else {
					res.render('inbox/inbox', {announcements: foundAnns, announced: false, username: foundUser.username, notifs: foundUser.inbox.reverse()})
				}
			})
		}
	})
})

router.get('/view_inbox_message', (req, res) => {
	Notification.findOne({_id: req.query.id}).populate({path: 'sender', select: ['username', 'imageUrl']})
	.exec((err, foundNotif) => {
		if (err || !foundNotif) {
			req.flash('error', "Unable to access database")
			res.redirect('back')

		} else {
			Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
				if (err || !foundAnns) {
					req.flash('error', 'Unable to access database')
					res.redirect('back')
				} else {
					res.render('inbox/notification', {announcements: foundAnns, announced: false, notif: foundNotif})
				}
			})
		}
	})
})

//Clear entire inbox
router.get('/clear', (req, res) => {

	Notification.deleteMany({_id: {$in: req.user.inbox}}, (err, deletedNotifs) => {
		if (err || !deletedNotifs) {
			req.flash('error', 'A Problem Occured, Unable to Delete');
	    res.redirect('back');

		} else {
			req.user.inbox = []
			req.user.save()
			req.flash('success', 'Inbox cleared!');
			res.redirect('/inbox');
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
		req.user.inbox.splice(req.user.inbox.indexOf(notif), 1)
	}

	Notification.deleteMany({_id: {$in: deletes}}, (err, deletedNotifs) => { //Delete based on the notification's id
		if (err || !deletedNotifs) {
			req.flash('error', 'A Problem Occured, Unable to Delete');
	    res.redirect('back');

		} else {
			req.flash('success', 'Notification(s) deleted!');
			res.redirect('/inbox');
		}
	})
})

module.exports = router;
