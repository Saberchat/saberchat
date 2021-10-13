const express = require('express');
const middleware = require('../middleware/index');
const {validateNewUser, validateUserLogin, validatePasswordReset} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const index = require('../controllers/index'); //Controller
const router = express.Router(); //Router

// USER ROUTES
router.get('/', wrapAsync(index.index)); // Index Landing Page
router.get('/home', wrapAsync(index.homepage)); // Homepage Feed
router.get('/darkmode', wrapAsync(middleware.isLoggedIn), wrapAsync(index.darkmode)); //Set darkmode
router.get('/contact', wrapAsync(middleware.isLoggedIn), wrapAsync(index.contact)); //Contact info and school info
router.get('/info', wrapAsync(index.info)); //Platform info
router.get('/ecdocs', wrapAsync(index.ecdocs)); //EC info
router.get('/logout', wrapAsync(middleware.isLoggedIn), index.logout); //logout route

router.post("/register", validateNewUser, wrapAsync(index.register)); //Register User
router.get('/authenticate/:id', wrapAsync(index.authenticate)); // Index Landing Page
router.post('/login', validateUserLogin, index.login); // Custom login handling so that flash messages can be sent.
router.post('/forgot-password', validatePasswordReset, wrapAsync(index.forgotPassword)); //Submit forgot password form

router.route('/reset-password')
    .get(wrapAsync(index.resetPasswordForm)) //Form to reset password
    .put(wrapAsync(index.resetPassword)); //Reset password

module.exports = router;