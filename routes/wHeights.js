//LIBRARIES
const express = require('express');
const middleware = require('../middleware');
const {validatePostComment} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const wHeights = require('../controllers/wHeights'); //Controller
module.exports = express.Router(); //Router

// index page/create article
module.exports.route('/')
    .get(middleware.isLoggedIn, wrapAsync(wHeights.index));

// display form for creating articles
module.exports.route('/new')
    .get(middleware.isLoggedIn, wrapAsync(wHeights.new))
    .post(middleware.isLoggedIn, wrapAsync(wHeights.create));

module.exports.put('/comment', middleware.isLoggedIn, validatePostComment, wrapAsync(wHeights.comment)); //Comment on article
module.exports.put('/like-comment', middleware.isLoggedIn, wrapAsync(wHeights.likeComment)); //Like A Comment
module.exports.get('/:id', middleware.isLoggedIn, wrapAsync(wHeights.show)); // Display specific article
