const express = require('express')
const {multipleUpload} = require('../middleware/multer');
const {validateUserUpdate, validateEmailUpdate, validatePasswordUpdate} = require('../middleware/validation');
const middleware = require('../middleware');
const wrapAsync = require("../utils/wrapAsync");
const profile = require("../controllers/profile"); //Controller
const router = express.Router(); //Router

router.route('/')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(profile.index)) // renders the list of users page
    .put(wrapAsync(middleware.isLoggedIn), multipleUpload, validateUserUpdate, wrapAsync(profile.update));

router.get('/edit', wrapAsync(middleware.isLoggedIn), wrapAsync(profile.edit)); //renders profiles edit page
router.get('/change-login-info', wrapAsync(middleware.isLoggedIn), wrapAsync(profile.changeLoginInfo)); //renders the email/password edit page
router.get('/confirm-email/:id', wrapAsync(profile.confirmEmail)); //Confirm new email
router.get('/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(profile.show)); //Show specific user's profile

router.put('/profile', wrapAsync(middleware.isLoggedIn), multipleUpload, validateUserUpdate, wrapAsync(profile.profilePut)); // update user route.
router.put('/tag', middleware.isAdmin, wrapAsync(profile.tagPut)); //Update user's tags
router.put('/change-email', wrapAsync(middleware.isLoggedIn), validateEmailUpdate, wrapAsync(profile.changeEmailPut)); //route for changing email
router.put('/change-password', wrapAsync(middleware.isLoggedIn), validatePasswordUpdate, wrapAsync(profile.changePasswordPut)); //route for changing password
router.put('/follow/:id', wrapAsync(profile.follow)); //Follow user
router.put('/unfollow/:id', wrapAsync(profile.unfollow)); //Unfollow user
router.put('/remove/:id', wrapAsync(profile.remove)); //Remove/block user
router.put('/unblock/:id', wrapAsync(profile.unblock)); //Unblock user

// router.delete('/delete-account', wrapAsync(middleware.isLoggedIn), wrapAsync(profile.deleteAccount));

module.exports = router;