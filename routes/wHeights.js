//LIBRARIES
const express = require('express');
const router = express.Router();
const middleware = require('../middleware');
const {validatePostComment} = require('../middleware/validation');
const wHeightsController = require('../controllers/wHeights');
const wrapAsync = require('../utils/wrapAsync');

// index page/create article
router.route('/')
    .get(middleware.isLoggedIn, wrapAsync(wHeightsController.index));

// display form for creating articles
router.route('/new')
    .get(middleware.isLoggedIn, wrapAsync(wHeightsController.new))
    .post(middleware.isLoggedIn, wrapAsync(wHeightsController.create));

router.put('/comment', middleware.isLoggedIn, validatePostComment, wrapAsync(wHeightsController.comment)); //Comment on article
router.put('/like-comment', middleware.isLoggedIn, wrapAsync(wHeightsController.likeComment)); //Like A Comment
router.get('/:id', middleware.isLoggedIn, wrapAsync(wHeightsController.show)); // Display specific article

module.exports = router;
