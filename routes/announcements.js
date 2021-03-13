//announcements routes dictate the posting, viewing, and editing of the Saberchat announcements Bulletin

//LIBRARIES
const express = require('express');
const middleware = require('../middleware/index');
const {multipleUpload} = require('../middleware/multer');
const {validateAnn} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const announcements = require('../controllers/announcements'); // Controller
const router = express.Router(); //Router

//ROUTES
router.route('/')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.index)) //Show all announcements
    .post(wrapAsync(middleware.isLoggedIn), middleware.isMod, multipleUpload, validateAnn, wrapAsync(announcements.create)); //Create announcement

router.get('/new', wrapAsync(middleware.isLoggedIn), middleware.isMod, wrapAsync(announcements.new)); //Form to create new announcement
router.get('/mark-all', wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.markAll)); //Mark all announcements as read
router.get('/mark/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.markOne)); //Mark specific announcement as read

router.put('/like', wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.likeAnn)); //Like announcement
router.put('/like-comment', wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.likeComment)); //Comment on announcement
router.put('/comment', wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.comment)); //Like a comment on announcement

router.route('/:id')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.show)) //Show specific announcement
    .put(wrapAsync(middleware.isLoggedIn), middleware.isMod, multipleUpload, wrapAsync(announcements.updateAnn)) //Update specific announcement
    .delete(wrapAsync(middleware.isLoggedIn), middleware.isMod, wrapAsync(announcements.deleteAnn)); //Delete specific announcement

router.get('/:id/edit', wrapAsync(middleware.isLoggedIn), middleware.isMod, wrapAsync(announcements.updateForm)); //Form to edit specific announcement

module.exports = router;