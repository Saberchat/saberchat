const express = require('express');
//start express router
const router = express.Router();
//import passport for authentication
const passport = require('passport');

//import user schema for db actions
const User = require('../models/user');

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
	var newUser = new User({email: req.body.email, username: req.body.username});

	//registers the user
	User.register(newUser, req.body.password, function(err, user) {
		if(err) {
			//flash message the error if there is an error registering user
			req.flash("error", err.message);
			console.log(err);
			//redirect to root
			return res.redirect("/");
		}
		
		//if registration is successful, login user. 
		passport.authenticate("local")(req, res, function() {
			//flash message for succesful login
			req.flash("success", "Welcome to Saber Chat " + user.username);
			res.redirect("/chat");
			console.log('succesfully registered and logged in user')
		});
	});
});

// Simple login handling

// router.post("/login", passport.authenticate("local", {
// 	successRedirect: "/",
// 	failureRedirect: "/"
// }), function(req, res) {
// });

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
            req.flash('success', 'Successfully Signed In');
            return res.redirect('/');
        });
    })(req, res, next);
});

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