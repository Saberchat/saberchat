const express = require('express');
const router = express.Router(); //start express router

const middleware = require('../middleware/index');
const {validateNewUser, validateUserLogin, validatePasswordReset} = require('../middleware/validation');
const indexController = require('../controllers/index');
const wrapAsync = require('../utils/wrapAsync');

// Index Landing Page
router.route('/')
    .get(wrapAsync(indexController.index));

// USER ROUTES

//Register User
router.route("/register")
    .post(validateNewUser, wrapAsync(indexController.register));

router.route('/authenticate/:id')
    .get(wrapAsync(indexController.authenticate));

// Custom login handling so that flash messages can be sent.
router.route('/login')
    .post(validateUserLogin, indexController.login); //No async

router.route('/forgot-password')
    .post(validatePasswordReset, wrapAsync(indexController.forgotPassword));

router.route('/reset-password')
    .get(wrapAsync(indexController.resetPasswordForm))
    .put(wrapAsync(indexController.resetPassword));

//logout route
router.route("/logout")
    .get(middleware.isLoggedIn, wrapAsync(indexController.logout));

//Set darkmode
router.route('/darkmode')
    .get(middleware.isLoggedIn, wrapAsync(indexController.darkmode));

//Contact info and school info
router.route('/contact')
    .get(middleware.isLoggedIn, wrapAsync(indexController.contact));

router.route('/alsion')
    .get(wrapAsync(indexController.alsion));

module.exports = router;
