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
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), multipleUpload, validateAnn, wrapAsync(announcements.create)); //Create announcement

router.get('/new', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), wrapAsync(announcements.new)); //Form to create new announcement
router.get('/mark-all', wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.markAll)); //Mark all announcements as read
router.get('/mark/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.markOne)); //Mark specific announcement as read
router.get('/verify/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isMod), wrapAsync(announcements.verify)); //Verify Announcement

router.put('/like', wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.likeAnnouncement)); //Like announcement
router.put('/like-comment', wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.likeComment)); //Comment on announcement
router.put('/comment', wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.comment)); //Like a comment on announcement

router.route('/:id')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.show)) //Show specific announcement
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), multipleUpload, wrapAsync(announcements.updateAnnouncement)) //Update specific announcement
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), wrapAsync(announcements.deleteAnnouncement)); //Delete specific announcement

router.get('/:id/edit', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), wrapAsync(announcements.updateForm)); //Form to edit specific announcement

module.exports = router;