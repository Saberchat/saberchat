const express = require('express');
const middleware = require('../middleware/index');
const {validateNewUser, validateUserLogin, validatePasswordReset} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const index = require('../controllers/index'); //Controller
module.exports = express.Router(); //Router

// USER ROUTES
module.exports.get('/', index.index); // Index Landing Page
module.exports.get('/darkmode', middleware.isLoggedIn, index.darkmode); //Set darkmode
module.exports.get('/contact', middleware.isLoggedIn, wrapAsync(index.contact)); //Contact info and school info
module.exports.get('/alsion', wrapAsync(index.alsion)); //Alsion info
module.exports.get("/logout", middleware.isLoggedIn, index.logout); //logout route

module.exports.post("/register", validateNewUser, wrapAsync(index.register)); //Register User
module.exports.get('/authenticate/:id', wrapAsync(index.authenticate)); // Index Landing Page
module.exports.post('/login', validateUserLogin, index.login); // Custom login handling so that flash messages can be sent.
module.exports.post('/forgot-password', validatePasswordReset, wrapAsync(index.forgotPassword));

module.exports.route('/reset-password')
    .get(index.resetPasswordForm)
    .put(wrapAsync(index.resetPassword));
