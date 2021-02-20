//LIBRARIES
const express = require('express');
const middleware = require('../middleware');
const {validatePostComment} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const wHeights = require('../controllers/wHeights'); //Controller
const router = express.Router(); //Router

// index page/create article
router.route('/')
    .get(middleware.isLoggedIn, wrapAsync(wHeights.index));

// display form for creating articles
router.route('/new')
    .get(middleware.isLoggedIn, wrapAsync(wHeights.new))
    .post(middleware.isLoggedIn, wrapAsync(wHeights.create));

router.put('/comment', middleware.isLoggedIn, validatePostComment, wrapAsync(wHeights.comment)); //Comment on article
router.put('/like-comment', middleware.isLoggedIn, wrapAsync(wHeights.likeComment)); //Like A Comment
router.get('/:id', middleware.isLoggedIn, wrapAsync(wHeights.show)); // Display specific article

module.exports = router;