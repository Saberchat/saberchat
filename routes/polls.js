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
router.get('/new', wrapAsync(middleware.isLoggedIn), middleware.isPollster, wrapAsync(polls.form));

// Get poll link instructions
router.get('/new/instructions', wrapAsync(middleware.isLoggedIn), middleware.isPollster, wrapAsync(polls.instructions));

// Show poll
router.get('/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(polls.show));

// Create poll POST
router.post('/', wrapAsync(middleware.isLoggedIn), middleware.isPollster, wrapAsync(polls.create));

//
router.post('/:id/toggle-close', wrapAsync(middleware.isLoggedIn), middleware.isPollster, wrapAsync(polls.toggleClosed));

module.exports = router;