//Event routes dictate the process of posting to the error bulletin

//LIBRARIES
const express = require('express');
const middleware = require('../middleware/index');
const {multipleUpload} = require('../middleware/multer');
const wrapAsync = require('../utils/wrapAsync');
const polls = require('../controllers/polls'); // Controller
const router = express.Router(); //Router

//ROUTES

router.get('/', wrapAsync(middleware.isLoggedIn), wrapAsync(polls.index));


module.exports = router;