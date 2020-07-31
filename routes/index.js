const   express = require('express'),
        router = express.Router(),
        passport = require('passport');

const   User = require('../models/user');

// Home route
router.get('/', (req, res) => {
	res.render('index');
});

// ===========================
// User Routes
// ===========================
router.post("/register",  function(req, res) {
	console.log(req.body)
	var newUser = new User({email: req.body.email, username: req.body.username});
	User.register(newUser, req.body.password, function(err, user) {
		if(err) {
			req.flash("error", err.message);
			console.log(err);
			return res.redirect("/");
		}
		passport.authenticate("local")(req, res, function() {
			req.flash("success", "Welcome to Saber Chat " + user.username);
			res.redirect("/chat");
			console.log('succesfully registered and logged in user')
		});
	});
});

// router.post("/login", passport.authenticate("local", {
// 	successRedirect: "/",
// 	failureRedirect: "/"
// }), function(req, res) {
// });

router.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { 
            req.flash('error', 'Error Signing In');
            return res.redirect('/'); 
        }
        req.logIn(user, function(err) {
            if (err) { return next(err); }
            req.flash('success', 'Successfully Signed In');
            return res.redirect('/');
        });
    })(req, res, next);
});

router.get("/logout", function(req, res) {
	req.logout();
	req.flash("success", "Logged you out!");
	res.redirect("/");
});

module.exports = router;