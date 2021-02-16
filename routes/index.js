const express = require('express');
const router = express.Router(); //start express router

const middleware = require('../middleware/index');
const {validateNewUser, validateUserLogin, validatePasswordReset} = require('../middleware/validation');
const indexController = require('../controllers/index');
const wrapAsync = require('../utils/wrapAsync');


// USER ROUTES
router.get('/', indexController.index); // Index Landing Page
router.get('/darkmode', middleware.isLoggedIn, indexController.darkmode); //Set darkmode
router.get('/contact', middleware.isLoggedIn, wrapAsync(indexController.contact)); //Contact info and school info
router.get('/alsion', wrapAsync(indexController.alsion)); //Alsion info

router.post("/register", validateNewUser, wrapAsync(indexController.register)); //Register User
router.get('/authenticate/:id', wrapAsync(indexController.authenticate)); // Index Landing Page
router.post('/login', validateUserLogin, indexController.login); // Custom login handling so that flash messages can be sent.
router.post('/forgot-password', validatePasswordReset, wrapAsync(indexController.forgotPassword));
router.post("/logout", middleware.isLoggedIn, indexController.logout); //logout route

router.route('/reset-password')
    .get(indexController.resetPasswordForm)
    .put(wrapAsync(indexController.resetPassword));

module.exports = router;
