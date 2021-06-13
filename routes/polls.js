//Event routes dictate the process of posting to the error bulletin

//LIBRARIES
const express = require('express');
const middleware = require('../middleware/index');
const wrapAsync = require('../utils/wrapAsync');
const polls = require('../controllers/polls'); // Controller
const router = express.Router(); //Router

//ROUTES

// Index page
router.get('/', wrapAsync(middleware.isLoggedIn), wrapAsync(polls.index));

// Create poll form
router.get('/new', wrapAsync(middleware.isLoggedIn), middleware.isPollster, wrapAsync(polls.create));


module.exports = router;