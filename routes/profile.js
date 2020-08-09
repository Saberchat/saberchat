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

// update user route. Check if current user matches profile they're trying to edit with middleware.
router.put('/profile/:id', middleware.checkUserMatch, function(req, res) {
    //find and update the user with new info
    User.findByIdAndUpdate(req.params.id, req.body.user, function(err, updatedUser) {
        if(err) {
            req.flash('error', 'There was an error updating your profile')
            res.redirect('/profile')
        } else {
            req.flash('success', 'Updated your profile')
            res.redirect('/profile')
            console.log(updatedUser)
        }
    });
});

module.exports = router;