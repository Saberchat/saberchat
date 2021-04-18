//Event routes dictate the process of posting to the error bulletin

//LIBRARIES
const express = require('express');
const middleware = require('../middleware/index');
const {multipleUpload} = require('../middleware/multer');
const wrapAsync = require('../utils/wrapAsync');
const events = require('../controllers/events'); // Controller
const router = express.Router(); //Router

//ROUTES
router.route('/')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(events.index)) //Show all events
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), multipleUpload, wrapAsync(events.create)); //Create event

router.get('/new', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(events.new)); //Form to create new event

router.put('/like', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(events.likeEvent)); //Like event
router.put('/like-comment', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(events.likeComment)); //Comment on event
router.put('/comment', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(events.comment)); //Like comment on event
router.get('/verify/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isMod), wrapAsync(events.verify)); //Verify Event

router.route('/:id')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(events.show)) //Show specific event
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), multipleUpload, wrapAsync(events.updateEvent)) //Update specific event
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(events.deleteEvent)); //Delete specific event

router.get('/:id/edit', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(events.updateForm)); //Form to edit specific event

module.exports = router;