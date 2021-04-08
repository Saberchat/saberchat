const express = require('express')
const {multipleUpload} = require('../middleware/multer');
const {validateUserUpdate, validateEmailUpdate, validatePasswordUpdate} = require('../middleware/validation');
const middleware = require('../middleware');
const wrapAsync = require("../utils/wrapAsync");
const profiles = require("../controllers/profiles"); //Controller
const router = express.Router(); //Router

router.route('/')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(profiles.index)) // renders the list of users page
    .put(wrapAsync(middleware.isLoggedIn), multipleUpload, validateUserUpdate, wrapAsync(profiles.update));

router.get('/team', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(profiles.team));
router.get('/edit', wrapAsync(middleware.isLoggedIn), wrapAsync(profiles.edit)); //renders profiles edit page
router.get('/change-login-info', wrapAsync(middleware.isLoggedIn), wrapAsync(profiles.changeLoginInfo)); //renders the email/password edit page
router.get('/confirm-email/:id', wrapAsync(profiles.confirmEmail)); //Confirm new email
router.get('/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(profiles.show)); //Show specific user's profiles

router.put('/profiles', wrapAsync(middleware.isLoggedIn), multipleUpload, validateUserUpdate, wrapAsync(profiles.profilesPut)); // update user route.
router.put('/tag', wrapAsync(middleware.isAdmin), wrapAsync(profiles.tagPut)); //Update user's tags
router.put('/change-email', wrapAsync(middleware.isLoggedIn), validateEmailUpdate, wrapAsync(profiles.changeEmailPut)); //route for changing email
router.put('/change-password', wrapAsync(middleware.isLoggedIn), validatePasswordUpdate, wrapAsync(profiles.changePasswordPut)); //route for changing password
router.put('/follow/:id', wrapAsync(profiles.follow)); //Follow user
router.put('/unfollow/:id', wrapAsync(profiles.unfollow)); //Unfollow user
router.put('/remove/:id', wrapAsync(profiles.remove)); //Remove/block user
router.put('/unblock/:id', wrapAsync(profiles.unblock)); //Unblock user

// router.delete('/delete-account', wrapAsync(middleware.isLoggedIn), wrapAsync(profiles.deleteAccount));

module.exports = router;