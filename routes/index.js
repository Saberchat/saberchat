const express = require('express');
const Filter = require('bad-words');
const filter = new Filter();
//start express router
const router = express.Router();
//import passport for authentication
const passport = require('passport');
const nodemailer = require('nodemailer');
const {transport, transport_mandatory} = require("../transport");

const middleware = require('../middleware/index');
const { validateNewUser, validateUserLogin, validatePasswordReset } = require('../middleware/validation');

//import user schema for db actions
const User = require('../models/user');
const Email = require('../models/email');
const Announcement = require('../models/announcement');

// Home route. gives the landing or home or index page (whatever you want to call it).
router.get('/', (req, res) => {
	User.find({}, (err, users) => {
		for (let user of users) {
			user.authenticated = true;
			user.save();
		}
		res.render('index');
	});

});

// ===========================
// User Routes
// for user actions
// ===========================

//new registered user
router.post("/register", validateNewUser, (req, res) => {

  Email.find({address: req.body.email}, (err, emails) => {
    if (err || !emails) {
      console.log(err);
      req.flash('error', "Unable to find emails");
      req.flash('error', 'Only members of the Alsion community may sign up');
      res.redirect('/');

    } else if (emails.length < 1 && req.body.email.split("@")[1] != "alsionschool.org" ) {
      req.flash('error', 'Only members of the Alsion community may sign up');
      res.redirect('/');

    } else {
      let username = req.body.username;
      if (username[username.length - 1] == ' ') { //Space at the end of username causes errors that are hard to fix, and unnecessary if we nip it in the bud here
        username = username.slice(0, username.length - 1);
      }

      let firstName = req.body.firstName;
      if (firstName[firstName.length - 1] == ' ') { //Space at the end of username causes errors that are hard to fix, and unnecessary if we nip it in the bud here
        firstName = firstName.slice(0, firstName.length - 1);
      }

      let lastName = req.body.lastName;
      if (lastName[lastName.length - 1] == ' ') { //Space at the end of username causes errors that are hard to fix, and unnecessary if we nip it in the bud here
        lastName = lastName.slice(0, lastName.length - 1);
      }

      let email = req.body.email;
      if (email[email.length - 1] == ' ') { //Space at the end of username causes errors that are hard to fix, and unnecessary if we nip it in the bud here
        email = email.slice(0, email.length - 1);
      }

      //Create authentication token
      let charSetMatrix = [];

      charSetMatrix.push('qwertyuiopasdfghjklzxcvbnm'.split(''));
      charSetMatrix.push('QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
      charSetMatrix.push('1234567890'.split(''));

      let tokenLength = Math.round((Math.random() * 15)) + 15;
      let token = "";

      let charSet; //Which character set to choose from

      for (let i = 0; i < tokenLength; i += 1) {
        charSet = charSetMatrix[Math.floor(Math.random() * 3)];
        token += charSet[Math.floor((Math.random() * charSet.length))];
      }

      //creates new user from form info
      let newUser = new User(
        {
          email: email,
          firstName: firstName,
          lastName: lastName,
          username: filter.clean(username),
          msgCount: 0,
          annCount: [],
          reqCount: 0,
          authenticated: false,
          authenticationToken: token
        }
      );

      //Update annCount with all announcements

      Announcement.find({}, (err, anns) => {
        if (err || !anns) {
          req.flash('error', "Unable to find announcements");
          res.redirect('back');

        } else {
          for (let ann of anns) {
            newUser.annCount.push({announcement: ann,version : "new"});
          }
        }
      });

      //registers the user
      User.register(newUser, req.body.password, (err, user) => {
        if(err) {
          //flash message the error if there is an error registering user
          if(err.name == 'UserExistsError') {
            req.flash('error', 'Email is already taken');
          } else {
            req.flash("error", err.message);
          }
          //redirect to root
          return res.redirect("/");
        }
        transport_mandatory(transporter, user, 'Verify Saberchat Account', `<p>Hello ${newUser.firstName},</p><p>Welcome to Saberchat! A confirmation of your account:</p><ul><li>Your username is ${newUser.username}.</li><li>Your full name is ${newUser.firstName} ${newUser.lastName}.</li><li>Your linked email is ${newUser.email}</li></ul><p>Click <a href="https://alsion-saberchat.herokuapp.com/authenticate/${newUser._id}?token=${token}">this link</a> to verify your account.</p>`);
        // if registration is successful, login user.
        req.flash("success", "Welcome to Saberchat " + user.firstName + "! Go to your email to verify your account");
        res.redirect("/");
      });
    }
  });
});

router.get('/authenticate/:id', (req, res) => {
  User.findById(req.params.id, (err, user) => {
    if (err || !user) {
      req.flash('error', "Unable to find user");
      res.redirect('/');

    } else {

      //Update authentication token
      let charSetMatrix = [];

      charSetMatrix.push('qwertyuiopasdfghjklzxcvbnm'.split(''));
      charSetMatrix.push('QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
      charSetMatrix.push('1234567890'.split(''));

      let tokenLength = Math.round((Math.random() * 15)) + 15;
      let token = "";

      let charSet; //Which character set to choose from

      for (let i = 0; i < tokenLength; i += 1) {
        charSet = charSetMatrix[Math.floor(Math.random() * 3)];
        token += charSet[Math.floor((Math.random() * charSet.length))];
      }

      if (req.query.token.toString() == user.authenticationToken.toString()) {
        user.authenticated = true;
        user.authenticationToken = token;
        user.save();

        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }

          transport_mandatory(user, 'Welcome To Saberchat!', `<p>Hello ${user.firstName},</p><p>Welcome to Saberchat! A confirmation of your account:</p><ul><li>Your username is ${user.username}.</li><li>Your full name is ${user.firstName} ${user.lastName}.</li><li>Your linked email is ${user.email}</li></ul><p>You will be assigned a role and status soon.</p>`);
          req.flash('success', 'Welcome ' + user.firstName);
          return res.redirect('/');
        });

      } else {
        req.flash('error', "Invalid authentication token");
        res.redirect('/');
      }
    }
  });
});

// Custom login handling so that flash messages can be sent. I'm not entirely sure how it works. Copy pasted from official doc
router.post('/login', validateUserLogin, function(req, res, next) {
	//authenticate user
    passport.authenticate('local', (err, user, info) => {
        if (err) { return next(err); }
        if (!user) {
			//flash message error
            req.flash('error', 'Invalid Email or Password');
            return res.redirect('/');
        } else if (!user.authenticated) {
          req.flash('error', 'Go to your email to verify your account');
          return res.redirect('/');
        }
		//If authentication succeeds, log in user again
        req.logIn(user, (err) => {
			if (err) { return next(err); }
			//flash message success
            req.flash('success', 'Welcome ' + user.firstName);
            return res.redirect('/');
        });
    })(req, res, next);
});

router.post('/forgot-password', validatePasswordReset, (req, res) => {
  User.find({authenticated: true, 'email': req.body.newPwdEmail}, (err,  users) => {
    if (!users) {
      req.flash('error', "Unable to find users");
      res.redirect('/');

    } else if (users.length == 0) {
      req.flash('error', "We couldn't find any users with that email address");
      res.redirect('/');

    } else {

      let charSetMatrix = [];

      charSetMatrix.push('qwertyuiopasdfghjklzxcvbnm'.split(''));
      charSetMatrix.push('QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
      charSetMatrix.push('1234567890'.split(''));
      charSetMatrix.push('()%!~$#*-=+[)\\{]|\'",.<>');

      let pwd_length = Math.round((Math.random() * 15)) + 15;
      let pwd = "";

      let charSet; //Which character set to choose from
      for (let i = 0; i < pwd_length; i += 1) {
        charSet = charSetMatrix[Math.floor(Math.random() * 3)];
        pwd += charSet[Math.floor((Math.random() * charSet.length))];
      }

      for (let user of users) {
        user.tempPwd = pwd;
        user.save();
      }

      transport_mandatory(users[0], 'Saberchat Password Reset', `<p>Hello ${users[0].firstName},</p><p>You are receiving this email because you recently requested a password reset.</p><p>Click <a href="https://alsion-saberchat.herokuapp.com/reset-password?user=${users[0]._id}">here</a> to reset your password. Use the following character sequence as your temporary password:</p><p>${pwd}</p>`);
      req.flash('success', "Check your email for instructions on  how to reset your password");
      res.redirect('/');
    }
  });
});

router.get('/reset-password', (req, res) => {
  res.render('profile/reset-password', {user: req.query.user});
})

router.put('/reset-password', (req, res) => {

  if (req.body.newPwd == req.body.newPwdConfirm) {
    User.findById(req.query.user, (err,  user) => {
      if (!user) {
        req.flash('error', "Unable to find your profile");
        res.redirect('/');

      } else {

        if (req.body.tempPwd == user.tempPwd) {
          user.setPassword(req.body.newPwd, () => {
            user.tempPwd = null;
            user.save();
          })

          transport_mandatory(user, "Password Reset Confirmation", `<p>Hello ${user.firstName},</p><p>You are receiving this email because you recently reset your Saberchat password.</p><p>If you did not recently reset your password, contact a faculty member immediately.</p><p>If you did, you can ignore this message.</p>`);
          req.flash('success', "Password reset!");
          res.redirect('/');

        } else {
          req.flash('error', "Your temporary password is incorrect. Make sure you are using the password that was sent to your email.");
          res.redirect('back');
        }
      }
    });

  } else {
    req.flash('error', "Passwords do not match");
    res.redirect('back');
  }
});

// >>>>>>> c413c2fa840ea70b4f1a6207ded0a60067579863
//logout route
router.get("/logout", (req, res) => {
	//logout with passport
	req.logout();
	//flash message success and redirect
	req.flash("success", "Logged you out!");
	res.redirect("/");
});

router.get('/contact', middleware.isLoggedIn, (req, res) => {
	User.find({authenticated: true, authenticated: true, status: 'faculty'}, (err, faculty) => {
		if (err || !faculty) {
			req.flash('error', "Unable to access database");
			res.redirect('back');

		} else {
			res.render('other/contact', {faculty});
		}
	});
});

router.get('/alsion', (req, res) => {
	User.find({authenticated: true, status: 'faculty'}, (err, faculty) => {
		if (err || !faculty) {
			req.flash('error', "Unable to access database");
			res.redirect('back');

		} else {
			let teacherNames = [];

			for (let fac of faculty) {
				teacherNames.push(`${fac.firstName} ${fac.lastName}`);
			}

			res.render('other/alsion_info', {faculty: teacherNames.join(', ')});
		}
	});
});

// router.get('/darkmode', middleware.isLoggedIn, (req, res) => {
//   if (req.user.darkmode) {
//     req.user.darkmode = false;
//
//   } else {
//     req.user.darkmode = true;
//   }
//
//   req.user.save();
//   res.redirect('back');
// });

//export router with all the routes connected
module.exports = router;
