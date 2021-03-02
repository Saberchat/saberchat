const express = require('express');
const middleware = require('../middleware/index');
const {validateNewUser, validateUserLogin, validatePasswordReset} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const index = require('../controllers/index'); //Controller
const router = express.Router(); //Router

// USER ROUTES
router.get('/', index.index); // Index Landing Page
router.get('/darkmode', middleware.isLoggedIn, index.darkmode); //Set darkmode
router.get('/contact', middleware.isLoggedIn, wrapAsync(index.contact)); //Contact info and school info
router.get('/alsion', wrapAsync(index.alsion)); //Alsion info
router.get("/logout", middleware.isLoggedIn, index.logout); //logout route

router.post("/register", validateNewUser, wrapAsync(index.register)); //Register User
router.get('/authenticate/:id', wrapAsync(index.authenticate)); // Index Landing Page
router.post('/login', validateUserLogin, index.login); // Custom login handling so that flash messages can be sent.
router.post('/forgot-password', validatePasswordReset, wrapAsync(index.forgotPassword)); //Submit forgot password form

router.route('/reset-password')
    .get(index.resetPasswordForm) //Form to reset password
    .put(wrapAsync(index.resetPassword)); //Reset password

module.exports = router;