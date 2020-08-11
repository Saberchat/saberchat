const   express = require('express'),
        router = express.Router();

const User = require('../models/user');

const middleware = require('../middleware');

//renders views/profile/index.ejs at /profile route.
router.get('/profile', middleware.isLoggedIn, function(req, res) {
    res.render('profile/index');
});

//renders profile edit page
router.get('/profile/edit', middleware.isLoggedIn, function(req, res) {
    res.render('profile/edit');
});

//renders the email/password edit page
router.get('/profile/change-login-info', middleware.isLoggedIn, function(req, res) {
    res.render('profile/pwd_email_edit');
});

// update user route. Check if current user matches profile they're trying to edit with middleware.
router.put('/profile/:id/edit', middleware.checkUserMatch, function(req, res) {
    //find and update the user with new info
    User.findByIdAndUpdate(req.params.id, req.body.user, function(err, updatedUser) {
        if(err) {
            req.flash('error', 'There was an error updating your profile');
            res.redirect('/profile');
        } else {
            req.flash('success', 'Updated your profile');
            res.redirect('/profile');
            console.log(updatedUser);
        }
    });
});

//route for changing email. Similar to edit profile route. But changing email logs out user for some reason.
router.put('/profile/:id/change-email', middleware.checkUserMatch, function(req, res) {
    User.findByIdAndUpdate(req.params.id, {email: req.body.email}, function(err, updatedUser) {
        if(err) {
            req.flash('error', 'There was an error changing your email');
            res.redirect('/');
        } else {
            req.flash('success', 'Updated your profile. Please Login Again.');
            res.redirect('/');
        }
    });
});
//route for changing password. Not too much different from previous routes.
router.put('/profile/:id/change-password', middleware.checkUserMatch, function(req, res) {
    User.findById(req.params.id, function(err, foundUser) {
        if(err) {
            req.flash('error', 'Error, cannot find user');
            res.redirect('/');
        } else {
            foundUser.changePassword(req.body.oldPassword, req.body.newPassword, function(err) {
                if(err) {
                    req.flash('error', 'Error changing your password. Check if old password is correct.');
                    res.redirect('/');
                } else {
                    req.flash('success', 'Successfully changed your password');
                    res.redirect('/profile');
                }
            });
        }
    });
});

module.exports = router;