const express = require('express')
const {multipleUpload} = require('../middleware/multer');
const {validateUserUpdate, validateEmailUpdate, validatePasswordUpdate} = require('../middleware/validation');
const middleware = require('../middleware');
const wrapAsync = require("../utils/wrapAsync");
const profile = require("../controllers/profile"); //Controller
const router = express.Router(); //Router

router.route('/')
    .get(middleware.isLoggedIn, wrapAsync(profile.index)) // renders the list of users page
    .put(middleware.isLoggedIn, multipleUpload, validateUserUpdate, wrapAsync(profile.update));

router.get('/edit', middleware.isLoggedIn, profile.edit); //renders profiles edit page
router.get('/change-login-info', middleware.isLoggedIn, profile.changeLoginInfo); //renders the email/password edit page
router.get('/confirm-email/:id', wrapAsync(profile.confirmEmail));
router.get('/:id', middleware.isLoggedIn, wrapAsync(profile.show));

router.put('/profile', middleware.isLoggedIn, multipleUpload, validateUserUpdate, wrapAsync(profile.profilePut)); // update user route.
router.put('/tag', middleware.isAdmin, profile.tagPut);
router.put('/change-email', middleware.isLoggedIn, validateEmailUpdate, wrapAsync(profile.changeEmailPut)); //route for changing email
router.put('/change-password', middleware.isLoggedIn, validatePasswordUpdate, wrapAsync(profile.changePasswordPut)); //route for changing password
router.put('/follow/:id', wrapAsync(profile.follow));
router.put('/unfollow/:id', wrapAsync(profile.unfollow));
router.put('/remove/:id', wrapAsync(profile.remove));

// router.delete('/delete-account', middleware.isLoggedIn, wrapAsync(profile.deleteAccount));

module.exports = router;