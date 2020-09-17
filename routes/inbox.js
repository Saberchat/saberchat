const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat');
const User = require('../models/user');
const Notification = require('../models/notification');
const Announcement = require('../models/announcement');
const AccessReq = require('../models/accessRequest');
const Room = require('../models/room');

//Route to display user inbox
router.get('/', middleware.isLoggedIn, (req, res) => {
	async function inboxGet() {
		await req.user.populate({path: 'inbox', populate: { path: 'sender', select: ['username', 'imageUrl']}}).execPopulate();

		await req.user.populate(
			{
				path: 'requests',
				populate: [
					{ path: 'requester', select: ['username', 'imageUrl']},
					{ path: 'room', select: 'name'}
				]
			}).execPopulate();

		foundAnns = await Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message');
		if(!foundAnns) {req.flash('error', 'Unable to access database'); return res.redirect('back');}

		res.render('inbox/index', {announcements: foundAnns.reverse(), announced: false, inbox: req.user.inbox.reverse(), requests: req.user.requests.reverse(), viewing_sent: false});

	}
	inboxGet().catch(err => {
		console.log(err);
		req.flash('error', 'An error occured');
		res.redirect('back');
	});
});


//Access sendNotification file
router.get('/new', middleware.isLoggedIn, (req, res) => {
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

					res.render('inbox/new', {announcements: foundAnns.reverse(), announced: false, users: foundUsers, selected_users: [], currentUser: req.user})
				}
			})
		}
	})
})

//Route to send notification to a group of people
router.post('/send_group', middleware.isLoggedIn, (req, res) => {

	if(!req.body.recipient_list || req.body.recipient_list.length == 0) {
		req.flash('error', 'Please select recipients');
		return res.redirect('back');
	}

	let mailing_list = req.body.recipient_list.split(', ') //Creates list of recipients based on user input

	if (mailing_list.includes('everyone')) { //Send notif to everyone
		User.find({_id: {$ne: req.user._id}}, (err, foundUsers) => {
			if(err || !foundUsers) {
				req.flash('error', 'Unable to access Database');
				res.redirect('back');

			} else {

				if (req.body.images.split(', ')[0] == '') { //No images attached
					Notification.create({subject: req.body.subject, sender: req.user, text: req.body.message, recipients: foundUsers,  read: new Array(foundUsers.length).fill(false), images: [], toEveryone: true}, (err, notification) => {
						notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to each recipient's inbox
							if (i.notifCount == undefined) {
								i.notifCount = 1

							} else {
								i.notifCount += 1
							}
							i.save()
						}
					})

				} else { //Images are attached
					Notification.create({subject: req.body.subject, sender: req.user, text: req.body.message, recipients: foundUsers, read: new Array(foundUsers.length).fill(false), images: req.body.images.split(', '), toEveryone: true}, (err, notification) => {
						notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to recipient's inbox
							if (i.notifCount == undefined) {
								i.notifCount = 1

							} else {
								i.notifCount += 1
							}
							i.save()
						}
					})
				}
			}
			req.flash('success', `Notification sent to everyone!`)
			res.redirect('/inbox/new')
		})

	} else { //Send notif to specific mailing list

		User.find({'username': {$in: mailing_list}}, (err, foundUsers) => { //Access users from User schema
			if(err || !foundUsers) {
				req.flash('error', 'Unable to access Database');
				res.redirect('back');

			} else if(foundUsers.length != mailing_list.length) {
				req.flash('error', 'Some profiles were changed. Please send again');
				res.redirect('back');

			} else {


				if (req.body.images.split(', ')[0] == '') {
					Notification.create({subject: req.body.subject, sender: req.user, text: req.body.message, recipients: foundUsers, read: new Array(mailing_list.length).fill(false), images: [], toEveryone: false}, (err, notification) => {
						notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to each recipient's inbox
							if (i.notifCount == undefined) {
								i.notifCount = 1

							} else {
								i.notifCount += 1
							}
							i.save()
						}
					})

				} else {
					Notification.create({subject: req.body.subject, sender: req.user, text: req.body.message, recipients: foundUsers, read: new Array(mailing_list.length).fill(false), images: req.body.images.split(', '), toEveryone: false}, (err, notification) => {
						notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to each recipient's inbox
							if (i.notifCount == undefined) {
								i.notifCount = 1

							} else {
								i.notifCount += 1
							}
							i.save()
						}
					})
				}
				req.flash('success', `Notification sent to mailing list!!`)
				res.redirect('/inbox/new')
			}
		})
	}
})

//Send message via anonymous hotline
router.post('/send_anonymous', [middleware.isLoggedIn, middleware.isStudent], (req, res) => {
	let mailing_list = req.body.recipient_list_anonymous.split(', ') //Creates list of recipients based on user input

	if (mailing_list.includes('All Faculty')) { //Send notif to all faculty
		User.find({'status': 'faculty'}, (err, foundUsers) => {
			if(err || !foundUsers) {
				req.flash('error', 'Unable to access Database');
				res.redirect('back');

			} else if(foundUsers.length != mailing_list.length) {
				req.flash('error', 'Some profiles were changed. Please send again');
				res.redirect('back');

			} else {

				if (req.body.images.split(', ')[0] == '') {
					Notification.create({subject: req.body.subject, sender: null, text: req.body.message, recipients: foundUsers, read: new Array(foundUsers.length).fill(false), images: [], toEveryone: true}, (err, notification) => {
						notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to recipient's inbox
							if (i.notifCount == undefined) {
								i.notifCount = 1

							} else {
								i.notifCount += 1
							}
							i.save()
						}
					})

				} else {
					Notification.create({subject: req.body.subject, sender: null, text: req.body.message, recipients: foundUsers, read: new Array(foundUsers.length).fill(false), images: req.body.images.split(', '), toEveryone: true}, (err, notification) => {
						notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to recipient's inbox
							if (i.notifCount == undefined) {
								i.notifCount = 1

							} else {
								i.notifCount += 1
							}
							i.save()
						}
					})
				}
			}

			req.flash('success', `Notification sent to all faculty! Your identity has been kept anonymous`)
			res.redirect('/inbox/new')
		})

	} else { // Send notif to specific mailing list of faculty

		User.find({username: {$in: mailing_list}}, (err, foundUsers) => { //Access users from User schema
			if(err || !foundUsers) {
				req.flash('error', 'Unable to access Database');
				res.redirect('back');

			} else if(foundUsers.length != mailing_list.length) {
				req.flash('error', 'Some profiles were changed. Please send again');
				res.redirect('back');

			} else {

				if (req.body.images.split(', ')[0] == '') {
					Notification.create({subject: req.body.subject, sender: null, text: req.body.message, recipients: foundUsers, read: new Array(mailing_list.length).fill(false), images: [], toEveryone: false}, (err, notification) => {
						notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
						notification.save() //Create notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to recipient's inbox
							if (i.notifCount == undefined) {
								i.notifCount = 1

							} else {
								i.notifCount += 1
							}
							i.save()
						}
					})

				} else {
					Notification.create({subject: req.body.subject, sender: null, text: req.body.message, recipients: foundUsers, read: new Array(mailing_list.length).fill(false), images: req.body.images.split(', '), toEveryone: false}, (err, notification) => {
						notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
						notification.save() //Creat notification

						for (let i of foundUsers) {
							i.inbox.push(notification) //Add notif to recipient's inbox

							if (i.notifCount == undefined) {
								i.notifCount = 1

							} else {
								i.notifCount += 1
							}
							i.save()
						}
					})
				}

				req.flash('success', `Notification sent to mailing list! Your identity has been kept anonymous`)
				res.redirect('/inbox/new')
			}
		})
	}
})

//Accesses every notification that you have sent
router.get('/sent', middleware.isLoggedIn, (req, res) => {
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
					res.render('inbox/indexSent', {announcements: foundAnns.reverse(), announced: false, inbox: foundNotifs.reverse()})

				}
			})
		}
	})
})

//View message in your inbox in more detail
router.get('/:id', middleware.isLoggedIn, (req, res) => {
	Notification.findOne({_id: req.params.id}).populate({path: 'sender', select: ['username', 'imageUrl']})
	.exec((err, foundNotif) => {
		if (err || !foundNotif) {
			req.flash('error', "Unable to access database1")
			console.log(err)
			res.redirect('back')

		} else {

				if (foundNotif.sender == null || foundNotif.sender.username != req.user.username) {

				if (!foundNotif.read[foundNotif.recipients.indexOf(req.user._id.toString())]) {
					req.user.notifCount -= 1
					req.user.save()
					foundNotif.read[foundNotif.recipients.indexOf(req.user._id)] = true
					foundNotif.save()

					Notification.findByIdAndUpdate(foundNotif._id, {read: foundNotif.read}, (err, fn) => { //For some reason, foundNotif.save() wasn't saving file properly. Had to add this
						if (err || !fn) {
							req.flash('error', "Unable to access database")
							res.redirect('back')

						}
					})
				}
			}

			User.find({_id: {$in: foundNotif.recipients}}, (err, foundUsers) => {
				if (err || !foundUsers) {
					req.flash('error', 'Unable to access database')
					res.redirect('back')

				} else {

					Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
						if (err || !foundAnns) {
							req.flash('error', 'Unable to access database')
							res.redirect('back')

						} else {

							res.render(`inbox/show`, {announcements: foundAnns.reverse(), announced: false, notif: foundNotif, recipient_profiles: foundUsers})
						}
					})
				}
			})
		}
	})
})


//Clear entire inbox
router.delete('/clear', middleware.isLoggedIn, (req, res) => {
	req.user.inbox = []
	req.user.notifCount = 0
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

	Notification.find({_id: {$in: deletes}}, (err, foundNotifs) => {
		if (err || !foundNotifs) {
			req.flash('error', "Unable to access database")
			res.redirect('back')

		} else {

			for (let notif of foundNotifs) {

				for (let i of req.user.inbox) {
					if (notif._id.toString() == i.toString()) {
						req.user.inbox.splice(req.user.inbox.indexOf(i), 1)
					}
				}

				if (!notif.read[notif.recipients.indexOf(req.user._id)]) { //If you haven't read it yet but want to delete it, it's no longer new.
					req.user.notifCount -= 1
				}
			}
		}

		req.user.save()
		req.flash('success', 'Notification(s) deleted!')
		res.redirect('/inbox')
	})
})

router.put('/mark_all', middleware.isLoggedIn, (req, res) => {
	Notification.find({_id: {$in: req.user.inbox}}, (err, foundNotifs) => {
		if (err || !foundNotifs) {
			req.flash('error', "Unable to access database")
			res.redirect('back')

		} else {
			for (let notif of foundNotifs) {
				notif.read[notif.recipients.indexOf(req.user._id)] = true
				notif.save()

				Notification.findByIdAndUpdate(notif._id, {read: notif.read}, (err, fn) => { //For some reason, foundNotif.save() wasn't saving file properly. Had to add this
					if (err || !fn) {
						req.flash('error', "Unable to access database")
						res.redirect('back')

					}
				})
			}

			req.user.notifCount = 0
			req.user.save()

			req.flash("success", "All notifications marked as read")
			res.redirect('/inbox')
		}

	})
})

router.put('/mark_selected', middleware.isLoggedIn, (req, res) => {
	selected = [] //List of messages that are selected
	for (let item of req.user.inbox) {
		if (Object.keys(req.body).includes(item._id.toString())) { //If item is selected (checkbox)
			selected.push(item)
		}
	}

	Notification.find({_id: {$in: selected}}, (err, foundNotifs) => {
		if (err || !foundNotifs) {
			req.flash('error', "Unable to access database")
			res.redirect('back')

		} else {

			for (let notif of foundNotifs) {
				for (let i of req.user.inbox) {
					if (notif._id.toString() == i.toString()) {
						if (!notif.read[notif.recipients.indexOf(req.user._id)]) {
							notif.read[notif.recipients.indexOf(req.user._id)] = true
							notif.save()
							req.user.notifCount -= 1

							Notification.findByIdAndUpdate(notif._id, {read: notif.read}, (err, fn) => { //For some reason, foundNotif.save() wasn't saving file properly. Had to add this
								if (err || !fn) {
									req.flash('error', "Unable to access database")
									res.redirect('back')

								}
							})
						}
					}
				}
			}
		}

		req.user.save()

		req.flash('success', 'Notification(s) marked as read!')
		res.redirect('/inbox')
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
	async function handleAccept() {
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

			req.user.requests.splice(req.user.requests.indexOf(Req._id), 1) //Remove request from list of requests
			req.user.save()

			User.findById(Req.requester, (err, foundUser) => {
				if (err || !foundUser) {
					req.flash("error", 'Unable to access database')
					res.redirect('back')

				} else {

					Notification.create({subject: "Room Join Request Accepted", sender: req.user, text: `Your request to join room '${foundRoom.name}' has been accepted`, recipients: [foundUser], read: [0], toEveryone: false}, (err, notification) => {

						if (err || !foundUser) {
							req.flash('error', "Unable to access database")
							res.redirect('back')

						} else {
							notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
							notification.save() //Create notification

							foundUser.inbox.push(notification)

							if (foundUser.notifCount == undefined) {
								foundUser.notifCount = 1

							} else {
								foundUser.notifCount += 1
							}

							foundUser.save()
						}
					})
				}
			})

			await foundRoom.save();
			await Req.save();

			req.flash('success', 'Request accepted');
			res.redirect('/inbox');
		}
	}

	handleAccept().catch(err => {console.log(err); req.flash("error", "Unable to access database");return res.redirect('back');});
});

// route to reject request
router.post('/requests/:id/reject', middleware.isLoggedIn, (req, res) => {
	async function handleReject() {
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

			req.user.requests.splice(req.user.requests.indexOf(Req._id), 1) //Remove request from list of requests
			req.user.save()

			User.findById(Req.requester, (err, foundUser) => {
				if (err || !foundUser) {
					req.flash("error", 'Unable to access database')
					res.redirect('back')

				} else {

					Room.findById(Req.room._id, (err, foundRoom) => {
						if (err || !foundRoom) {
							req.flash("error", "Unable to access database")
							res.redirect('back')

						} else {
							Notification.create({subject: "Room Join Request Rejected", sender: req.user, text: `Your request to join room '${foundRoom.name}' has been rejected`, recipients: [foundUser], read: [0], toEveryone: false}, (err, notification) => {

								if (err || !foundUser) {
									req.flash('error', "Unable to access database")
									res.redirect('back')

								} else {
									notification.date = dateFormat(notification.created_at, "mmm d, h:MMTT")
									notification.save() //Create notification

									foundUser.inbox.push(notification)

									if (foundUser.notifCount == undefined) {
										foundUser.notifCount = 1

									} else {
										foundUser.notifCount += 1
									}

									foundUser.save()
								}
							})
						}
					})
				}
			})


			await Req.save();

			req.flash('success', 'Request rejected');
			res.redirect('/inbox');
		}
	}

	handleReject().catch(err => {console.log(err); req.flash("error", "Unable to access database");return res.redirect('back');});
});

module.exports = router;
