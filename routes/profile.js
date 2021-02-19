const express = require('express')
const {multipleUpload} = require('../middleware/multer');
const {validateUserUpdate, validateEmailUpdate, validatePasswordUpdate} = require('../middleware/validation');
const middleware = require('../middleware');
const wrapAsync = require("../utils/wrapAsync");
const profile = require("../controllers/profile"); //Controller
module.exports = express.Router(); //Router

module.exports.route('/')
    .get(middleware.isLoggedIn, wrapAsync(profile.index)) // renders the list of users page
    .put(middleware.isLoggedIn, multipleUpload, validateUserUpdate, wrapAsync(profile.update));

module.exports.get('/edit', middleware.isLoggedIn, profile.edit); //renders profiles edit page
module.exports.get('/change-login-info', middleware.isLoggedIn, profile.changeLoginInfo); //renders the email/password edit page
module.exports.get('/confirm-email/:id', wrapAsync(profile.confirmEmail));
module.exports.get('/:id', middleware.isLoggedIn, wrapAsync(profile.show));

module.exports.put('/profile', middleware.isLoggedIn, multipleUpload, validateUserUpdate, wrapAsync(profile.profilePut)); // update user route.
module.exports.put('/tag', middleware.isAdmin, profile.tagPut);
module.exports.put('/change-email', middleware.isLoggedIn, validateEmailUpdate, wrapAsync(profile.changeEmailPut)); //route for changing email
module.exports.put('/change-password', middleware.isLoggedIn, validatePasswordUpdate, wrapAsync(profile.changePasswordPut)); //route for changing password
module.exports.put('/follow/:id', wrapAsync(profile.follow));
module.exports.put('/unfollow/:id', wrapAsync(profile.unfollow));
module.exports.put('/remove/:id', wrapAsync(profile.remove));

// module.exports.delete('/delete-account', middleware.isLoggedIn, wrapAsync(profile.deleteAccount));
