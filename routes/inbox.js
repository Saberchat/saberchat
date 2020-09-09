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

					res.render('inbox/sendNotification', {announcements: foundAnns.reverse(), announced: false, users: foundUsers, selected_users: [], currentUser: req.user})
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
						notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to each recipient's inbox
							i.save()
						}
					})

				} else { //Images are attached
					Notification.create({subject: req.body.subject, sender: req.user, text: req.body.message, recipients: ['everyone'], images: req.body.images.split(', ')}, (err, notification) => {
						notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
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
						notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to each recipient's inbox
							i.save()
						}
					})

				} else {
					Notification.create({subject: req.body.subject, sender: req.user, text: req.body.message, recipients: mailing_list, images: req.body.images.split(', ')}, (err, notification) => {
						notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
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

	if (mailing_list.includes('All Faculty')) { //Send notif to all faculty
		User.find({'status': 'faculty'}, (err, foundUsers) => {
			if(err || !foundUsers) {
				req.flash('error', 'Unable to access Database');
				res.redirect('back');

			} else {

				if (req.body.images.split(', ')[0] == '') {
					Notification.create({subject: req.body.subject, sender: null, text: req.body.message, recipients: ['All Faculty'], images: []}, (err, notification) => {
						notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to recipient's inbox
							i.save()
						}
					})

				} else {
					Notification.create({subject: req.body.subject, sender: null, text: req.body.message, recipients: ['All Faculty'], images: req.body.images.split(', ')}, (err, notification) => {
						notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to recipient's inbox
							i.save()
						}
					})
				}
			}

			req.flash('success', `Notification sent to all faculty! Your identity has been kept anonymous`)
			res.redirect('/notif')
		})

	} else { // Send notif to specific mailing list of faculty

		User.find({username: {$in: mailing_list}}, (err, foundUsers) => { //Access users from User schema
			if(err || !foundUsers) {
				req.flash('error', 'Unable to access Database');
				res.redirect('back');

			} else {

				if (req.body.images.split(', ')[0] == '') {
					Notification.create({subject: req.body.subject, sender: null, text: req.body.message, recipients: mailing_list, images: []}, (err, notification) => {
						notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to recipient's inbox
							i.save()
						}
					})

				} else {
					Notification.create({subject: req.body.subject, sender: null, text: req.body.message, recipients: mailing_list, images: req.body.images.split(', ')}, (err, notification) => {
						notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
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

			Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
				if (err || !foundAnns) {
					req.flash('error', 'Unable to access database')
					res.redirect('back')

				} else {

					res.render('inbox/inbox', {announcements: foundAnns.reverse(), announced: false, username: foundUser.username, notifs: foundUser.inbox.reverse()})
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
			User.find({username: {$in: foundNotif.recipients}}, (err, foundUsers) => {
				if (err || !foundUsers) {
					req.flash('error', 'Unable to access database')
					res.redirect('back')

				} else {

					Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
						if (err || !foundAnns) {
							req.flash('error', 'Unable to access database')
							res.redirect('back')

						} else {

							res.render('inbox/notification', {announcements: foundAnns.reverse(), announced: false, notif: foundNotif, recipient_profiles: foundUsers})
						}
					})
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

			Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
				if (err || !foundAnns) {
					req.flash('error', 'Unable to access database')
					res.redirect('back')

				} else {

					res.render('inbox/sentNotifications', {announcements: foundAnns.reverse(), announced: false, notifs: foundNotifs.reverse()})
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

//Delete already viewed notifications
router.delete('/delete', middleware.isLoggedIn, (req, res) => {
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

module.exports = router;
