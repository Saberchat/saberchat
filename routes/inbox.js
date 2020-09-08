const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateFormat')
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
					let dates = []

					for (let ann of foundAnns) {
						dates.push(dateFormat(ann.created_at, "mmm d, h:MMTT"))
					}

					res.render('inbox/sendNotification', {announcements: foundAnns.reverse(), dates: dates.reverse(), announced: false, users: foundUsers, selected_users: [], currentUser: req.user})
				}
			})
		}
	})
})

//Route to send notification to a group of people
router.post('/send_group', middleware.isLoggedIn, (req, res) => {

	let mailing_list = req.body.recipient_list.split(', ') //Creates list of recipients based on user input

	if (mailing_list.includes('everyone')) { //Send notif to everyone
		User.find({'_id': {$nin: req.user._id}}, (err, foundUsers) => {
			if(err || !foundUsers) {
				req.flash('error', 'Unable to access Database');
				res.redirect('back');

			} else {

				if (req.body.images.split(', ')[0] == '') { //No images attached
					Notification.create({subject: req.body.subject, sender: req.user, text: req.body.message, recipients: ['everyone'], images: []}, (err, notification) => {
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to each recipient's inbox
							i.save()
						}
					})

				} else { //Images are attached
					Notification.create({subject: req.body.subject, sender: req.user, text: req.body.message, recipients: ['everyone'], images: req.body.images.split(', ')}, (err, notification) => {
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to recipient's inbox
							i.save()
						}
					})
				}
			}
			req.flash('success', `Notification sent to everyone!`)
			res.redirect('/notif')
		})

	} else { //Send notif to specific mailing list

		User.find({'username': {$in: mailing_list}}, (err, foundUsers) => { //Access users from User schema
			if(err || !foundUsers) {
				req.flash('error', 'Unable to access Database');
				res.redirect('back');

			} else {

				if (req.body.images.split(', ')[0] == '') {
					Notification.create({subject: req.body.subject, sender: req.user, text: req.body.message, recipients: mailing_list, images: []}, (err, notification) => {
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to each recipient's inbox
							i.save()
						}
					})

				} else {
					Notification.create({subject: req.body.subject, sender: req.user, text: req.body.message, recipients: mailing_list, images: req.body.images.split(', ')}, (err, notification) => {
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to each recipient's inbox
							i.save()
						}
					})
				}
				req.flash('success', `Notification sent to mailing list!!`)
				res.redirect('/notif')
			}
		})
	}
})

//Send message via anonymous hotline
router.post('/send_anonymous', (req, res) => {
	let mailing_list = req.body.recipient_list_anonymous.split(', ') //Creates list of recipients based on user input

	if (mailing_list.includes('All Teachers and Admins')) { //Send notif to all teachers and admins
		User.find({'permission': {$in: ['teacher', 'admin']}}, (err, foundUsers) => {
			if(err || !foundUsers) {
				req.flash('error', 'Unable to access Database');
				res.redirect('back');

			} else {

				if (req.body.images.split(', ')[0] == '') {
					Notification.create({subject: req.body.subject, sender: null, text: req.body.message, recipients: ['All teachers and admins'], images: []}, (err, notification) => {
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to recipient's inbox
							i.save()
						}
					})

				} else {
					Notification.create({subject: req.body.subject, sender: null, text: req.body.message, recipients: ['All teachers and admins'], images: req.body.images.split(', ')}, (err, notification) => {
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to recipient's inbox
							i.save()
						}
					})
				}
			}

			req.flash('success', `Notification sent to all teachers! Your identity has been kept anonymous`)
			res.redirect('/notif')
		})

	} else { // Send notif to specific mailing list of teachers and admins

		User.find({username: {$in: mailing_list}}, (err, foundUsers) => { //Access users from User schema
			if(err || !foundUsers) {
				req.flash('error', 'Unable to access Database');
				res.redirect('back');

			} else {

				if (req.body.images.split(', ')[0] == '') {
					Notification.create({subject: req.body.subject, sender: null, text: req.body.message, recipients: mailing_list, images: []}, (err, notification) => {
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to recipient's inbox
							i.save()
						}
					})

				} else {
					Notification.create({subject: req.body.subject, sender: null, text: req.body.message, recipients: mailing_list, images: req.body.images.split(', ')}, (err, notification) => {
						notification.save() //Creat notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to recipient's inbox
							i.save()
						}
					})
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
			let notifdates = []
			for (let notif of foundUser.inbox) {
				notifdates.push(dateFormat(notif.created_at, "mmm d, h:MMTT"))
			}
			Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
				if (err || !foundAnns) {
					req.flash('error', 'Unable to access database')
					res.redirect('back')

				} else {
					let dates = []

					for (let ann of foundAnns) {
						dates.push(dateFormat(ann.created_at, "mmm d, h:MMTT"))
					}

					res.render('inbox/inbox', {announcements: foundAnns.reverse(), dates: dates.reverse(), announced: false, username: foundUser.username, notifs: foundUser.inbox.reverse(), notifdates: notifdates.reverse()})
				}
			})
		}
	})
})

//View message in your inbox in more detail
router.get('/view_inbox_message/:id', middleware.isLoggedIn, (req, res) => {
	Notification.findOne({_id: req.params.id}).populate({path: 'sender', select: ['username', 'imageUrl']})
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
					let dates = []

					for (let ann of foundAnns) {
						dates.push(dateFormat(ann.created_at, "mmm d, h:MMTT"))
					}

					res.render('inbox/notification', {announcements: foundAnns.reverse(), dates: dates.reverse(), announced: false, notif: foundNotif, notifDate: dateFormat(foundNotif.created_at, "mmm d, h:MMTT")})
				}
			})
		}
	})
})

//Accesses every notification that you have sent
router.get('/view_sent_notifs', middleware.isLoggedIn, (req, res) => {
	Notification.find({'sender': req.user}, (err, foundNotifs) => {
		if (err || !foundNotifs) {
			req.flash('error', 'Unable to access database')
			res.redirect('/inbox')

		} else {

			let notifdates = []
			for (let notif of foundNotifs) {
				notifdates.push(dateFormat(notif.created_at, "mmm d, h:MMTT"))
			}

			Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
				if (err || !foundAnns) {
					req.flash('error', 'Unable to access database')
					res.redirect('back')

				} else {
					let dates = []

					for (let ann of foundAnns) {
						dates.push(dateFormat(ann.created_at, "mmm d, h:MMTT"))
					}

					res.render('inbox/sentNotifications', {announcements: foundAnns.reverse(), dates: dates.reverse(), announced: false, notifs: foundNotifs.reverse(), notifdates: notifdates.reverse()})
				}
			})
		}
	})
})

//Clear entire inbox
router.get('/clear', middleware.isLoggedIn, (req, res) => {
	req.user.inbox = []
	req.user.save()
	req.flash('success', 'Inbox cleared!');
	res.redirect('/inbox');
})

//Clears all notifications that you sent (permanently)
router.get('/clear_sent', middleware.isLoggedIn, (req, res) => {
	Notification.find({sender: req.user}, (err, foundNotifs) => {
		if (err || !foundNotifs) {
			req.flash('error', 'Unable to access database')
			res.redirect('back')

		} else {

			for (let notif of foundNotifs) {
				Notification.findByIdAndDelete(notif._id, (err, foundNotif) => {
					if (err || !foundNotif) {
						req.flash('error', 'Unable to access database')
						res.redirect('back')

					}
				})
			}

			req.flash('success', "All Sent Notifications Cleared!")
			res.redirect('/view_sent_notifs')
		}
	})
})

//Delete already viewed notifications
router.post('/delete', middleware.isLoggedIn, (req, res) => {
	deletes = [] //List of messages to be deleted
	for (let item of req.user.inbox) {
		if (Object.keys(req.body).includes(item._id.toString())) { //If item is selected to be deleted (checkbox)
			deletes.push(item)
		}
	}

	for (let notif of deletes) {
		req.user.inbox.splice(req.user.inbox.indexOf(notif), 1)
	}
	req.user.save()
	req.flash('success', 'Notification(s) deleted!')
	res.redirect('/inbox')
})

//Delete selected notifications that you sent (permanently)
router.post('/delete_sent', middleware.isLoggedIn, (req, res) => {
	deletes = [] //List of messages to be deleted

	Notification.find({sender: req.user}, (err, foundNotifs) => {
		if (err || !foundNotifs) {
			req.flash("error", "Unable to access database")
			res.redirect('back')

		} else {
			for (let notif of foundNotifs) {

				if (Object.keys(req.body).includes(notif._id.toString())) { //If item is selected to be deleted (checkbox)
					Notification.findByIdAndDelete(notif._id, (err, foundNotif) => {
						if (err || !foundNotif) {
							req.flash("error", "Unable to access database")
							res.redirect('back')
						}
					})
				}
			}
			req.flash('success', 'Notification(s) deleted!')
			res.redirect('/view_sent_notifs')
		}
	})
})

module.exports = router;
