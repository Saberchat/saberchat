//Puzzles routes dictate the posting, viewing, and answering of Saberchat puzzles

//LIBRARIES
const express = require('express');
const middleware = require('../middleware/index');
const {multipleUpload} = require('../middleware/multer');
const {validateAnn} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const puzzles = require('../controllers/puzzles'); // Controller
const router = express.Router(); //Router

//ROUTES
router.route('/')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(puzzles.index)) //Show all puzzles
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), multipleUpload, validateAnn, wrapAsync(puzzles.create)); //Create announcement

router.get('/new', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), wrapAsync(puzzles.new)); //Form to create new announcement
router.get('/verify/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isMod), wrapAsync(puzzles.verify)); //Verify Announcement

router.put('/like', wrapAsync(middleware.isLoggedIn), wrapAsync(puzzles.likeAnnouncement)); //Like announcement
router.put('/like-comment', wrapAsync(middleware.isLoggedIn), wrapAsync(puzzles.likeComment)); //Comment on announcement
router.put('/comment', wrapAsync(middleware.isLoggedIn), wrapAsync(puzzles.comment)); //Like a comment on announcement

router.route('/:id')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(puzzles.show)) //Show specific announcement
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), multipleUpload, wrapAsync(puzzles.updateAnnouncement)) //Update specific announcement
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), wrapAsync(puzzles.deleteAnnouncement)); //Delete specific announcement

router.get('/:id/edit', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), wrapAsync(puzzles.updateForm)); //Form to edit specific announcement

module.exports = router;