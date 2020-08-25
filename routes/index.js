const express = require('express');
const Filter = require('bad-words');
const filter = new Filter();
//start express router
const router = express.Router();
//import passport for authentication
const passport = require('passport');
const middleware = require('../middleware');
const textEncoding = require('text-encoding')
const TextDecoder = textEncoding.TextDecoder

//import user schema for db actions
const User = require('../models/user');
const Room = require('../models/room');
const Comment = require('../models/comment')
const Notification = require('../models/notification')

// Home route. gives the landing or home or index page (whatever you want to call it).
router.get('/', (req, res) => {
	res.render('index');
});

// ===========================
// User Routes
// for user actions
// ===========================

//new registered user
router.post("/register",  function(req, res) {
	//creates new user from form info
	newUser = new User(
		{
			email: req.body.email,
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			username: filter.clean(req.body.username)
		}
	);

	//registers the user
	User.register(newUser, req.body.password, function(err, user) {
		if(err) {
			//flash message the error if there is an error registering user
			if(err.name == 'UserExistsError') {
				req.flash('error', 'Email is already taken');
			} else {
				req.flash("error", err.message);
			}
			console.log(err);
			//redirect to root
			return res.redirect("/");
		}

		//if registration is successful, login user.
		passport.authenticate("local")(req, res, function() {
			//flash message for succesful login
			req.flash("success", "Welcome to Saberchat " + user.firstName);
			res.redirect("/");
			console.log('succesfully registered and logged in user')
		});
	});
});

// Custom login handling so that flash messages can be sent. I'm not entirely sure how it works. Copy pasted from official doc
router.post('/login', function(req, res, next) {
	//authenticate user
    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) {
			//flash message error
            req.flash('error', 'Invalid Email or Password');
            return res.redirect('/');
		}
		//login user again? I'm not sure why this is here.
        req.logIn(user, function(err) {
			if (err) { return next(err); }
			//flash message success
            req.flash('success', 'Welcome ' + user.firstName);
            return res.redirect('/');
        });
    })(req, res, next);
});

//Access sendNotification file
router.get('/sendNotification', middleware.isLoggedIn, (req, res, next) => {
	let types = ["Cafe Order Status Update", "Field Trip Notification", "PE Notification", "School Event Notification", "Class Schedule Change"]
	User.find({}, (err, foundUsers) => {
		if(err || !foundUsers) {
			req.flash('error', 'Unable to access Database');
			res.redirect('back');
		} else {
			res.render('chat/sendNotification', {users: foundUsers, types})
		}
	})
})

//Route to send 'notification', different from 'comment'
router.post('/sendNotif', middleware.isLoggedIn, (req, res) => {
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
						res.redirect('/sendNotification')
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
			res.render('chat/inbox', {username: req.user.username, notifs: notifList})
		}
	})
})

// >>>>>>> c413c2fa840ea70b4f1a6207ded0a60067579863
//logout route
router.get("/logout", function(req, res) {
	//logout with passport
	req.logout();
	//flash message success and redirect
	req.flash("success", "Logged you out!");
	res.redirect("/");
});
//export router with all the routes connected
module.exports = router;
