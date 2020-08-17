const express = require('express')
const router = express.Router();
const Filter = require('bad-words');
const filter = new Filter();

const User = require('../models/user');

const middleware = require('../middleware');

// renders the list of users page
router.get('/profiles', middleware.isLoggedIn, function(req, res) {
    User.find({}, function(err, foundUsers) {
        if(err || !foundUsers) {
            req.flash('error', 'Unable to access Database');
            res.redirect('back');
        } else {
            res.render('profile/index', {users: foundUsers});
        }
    });
});

//renders profiles edit page
router.get('/profiles/edit', middleware.isLoggedIn, function(req, res) {
    res.render('profile/edit');
});

//renders the email/password edit page
router.get('/profiles/change-login-info', middleware.isLoggedIn, function(req, res) {
    res.render('profile/edit_pwd_email');
});

//renders views/profiles/show.ejs at /profiles route.
router.get('/profiles/:id', middleware.isLoggedIn, function(req, res) {
    User.findById(req.params.id, function(err, foundUser) {
        if(err || !foundUser) {
            req.flash('error', 'Error. Cannot find user.');
            res.redirect('back');
        } else {
            res.render('profile/show', {user: foundUser});
        }
    });
});

// update user route. Check if current user matches profiles they're trying to edit with middleware.
router.put('/profiles/edit', middleware.isLoggedIn, function(req, res) {
    let user = {
        username: filter.clean(req.body.username),
        description: filter.clean(req.body.description),
        title: filter.clean(req.body.title),
        imageUrl: req.body.imageUrl,
        bannerUrl: req.body.bannerUrl
    }
    //find and update the user with new info
    User.findByIdAndUpdate(req.user._id, user, function(err, updatedUser) {
        if(err || !updatedUser) {
            req.flash('error', 'There was an error updating your profile');
            res.redirect('back');
        } else {
            req.flash('success', 'Updated your profile');
            res.redirect('/profiles/' + req.user._id);
            console.log(updatedUser);
        }
    });
});

//route for changing email. Similar to edit profiles route. But changing email logs out user for some reason.
router.put('/profiles/change-email', middleware.isLoggedIn, function(req, res) {
    User.findByIdAndUpdate(req.user._id, {email: req.body.email}, function(err, updatedUser) {
        if(err || !updatedUser) {
            req.flash('error', 'There was an error changing your email');
            res.redirect('/');
        } else {
            req.flash('success', 'Updated your profile. Please Login Again.');
            res.redirect('/');
        }
    });
});
//route for changing password. Not too much different from previous routes.
router.put('/profiles/change-password', middleware.isLoggedIn, function(req, res) {
    User.findById(req.user._id, function(err, foundUser) {
        if(err || !foundUser) {
            req.flash('error', 'Error, cannot find user');
            res.redirect('/');
        } else {
            foundUser.changePassword(req.body.oldPassword, req.body.newPassword, function(err) {
                if(err) {
                    req.flash('error', 'Error changing your password. Check if old password is correct.');
                    res.redirect('/');
                } else {
                    req.flash('success', 'Successfully changed your password');
                    res.redirect('/profiles/' + req.user._id);
                }
            });
        }
    });
});

module.exports = router;
