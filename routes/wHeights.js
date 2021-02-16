//LIBRARIES
const express = require('express');
const router = express.Router();
const middleware = require('../middleware');
const wHeightsController = require('../controllers/wHeights');
const wrapAsync = require('../utils/wrapAsync');

// index page/create article
router.route('/')
    .get(middleware.isLoggedIn, wrapAsync(wHeightsController.index));

// display form for creating articles
router.route('/new')
    .get(middleware.isLoggedIn, wrapAsync(wHeightsController.new))
    .post(middleware.isLoggedIn, wrapAsync(wHeightsController.create));

// display specific article
router.route('/:id')
    .get(middleware.isLoggedIn, wrapAsync(wHeightsController.show));

router.route('/comment')
    .put(middleware.isLoggedIn, wrapAsync(wHeightsController.comment));

router.route('/like-comment')
    .put(middleware.isLoggedIn, wrapAsync(wHeightsController.likeComment));

module.exports = router;
