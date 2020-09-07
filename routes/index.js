const express = require('express');
const Filter = require('bad-words');
const filter = new Filter();
//start express router
const router = express.Router();
//import passport for authentication
const passport = require('passport');
const middleware = require('../middleware');
const textEncoding = require('text-encoding')
const dateFormat = require('dateFormat')
const TextDecoder = textEncoding.TextDecoder

//import user schema for db actions
const User = require('../models/user');
const Room = require('../models/room');
const Comment = require('../models/comment')
const Notification = require('../models/notification')
const Announcement = require('../models/announcement')

// Home route. gives the landing or home or index page (whatever you want to call it).
router.get('/', (req, res) => {

	Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
		if (err || !foundAnns) {
			req.flash('error', 'Unable to access database')
			res.redirect('back')
    } else {

			let dates = []

			for (let ann of foundAnns) {
				dates.push(dateFormat(ann.created_at, "mmm d, h:MMTT"))
			}

      res.render('index', {announcements: foundAnns.reverse(), dates: dates.reverse()})
    }
  })
});

// ===========================
// User Routes
// for user actions
// ===========================

//new registered user
router.post("/register",  function(req, res) {
	if(req.body.email == '') {
		req.flash('error', 'Fill in email');
		res.redirect('/');
	} else if(!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(req.body.email)) {
		req.flash('error', 'Fill in valid email');
		res.redirect('/');
	} else if(req.body.firstName == '') {
		req.flash('error', 'Fill in first name');
		res.redirect('/');
	} else if(req.body.lastName == '') {
		req.flash('error', 'Fill in last name');
		res.redirect('/');
	} else if(req.body.username == '') {
		req.flash('error', 'Fill in username');
		res.redirect('/');
	} else if(req.body.password == '') {
		req.flash('error', 'Fill in password name');
		res.redirect('/');
	} else {
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
	}
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
