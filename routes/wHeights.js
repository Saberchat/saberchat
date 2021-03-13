//LIBRARIES
const express = require('express');
const middleware = require('../middleware');
const wrapAsync = require('../utils/wrapAsync');
const wHeights = require('../controllers/wHeights'); //Controller
const router = express.Router(); //Router

router.route('/')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(wHeights.index)); // index page

router.route('/new')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(wHeights.new)) //Form to create new article
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(wHeights.create)); //Create new article

router.put('/comment', wrapAsync(middleware.isLoggedIn), wrapAsync(wHeights.comment)); //Comment on article
router.put('/like-comment', wrapAsync(middleware.isLoggedIn), wrapAsync(wHeights.likeComment)); //Like A Comment
router.get('/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(wHeights.show)); // Display specific article

module.exports = router;