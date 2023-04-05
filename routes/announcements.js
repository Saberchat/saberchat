//announcements routes dictate the posting, viewing, and editing of the Saberchat announcements Bulletin

//LIBRARIES
const express = require('express');
const middleware = require('../middleware/index');
const {multipleUpload} = require('../middleware/multer');
const {validateAnn} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const announcements = require('../controllers/announcements'); // Controller
const router = express.Router(); // Router

// ROUTES

// Root
router.route('/')
    // show all announcements
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.index))
    // Create announcement
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.announcementPermission), multipleUpload, validateAnn, wrapAsync(announcements.create)); 

// Form to create new announcement
router.get('/new', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.announcementPermission), wrapAsync(announcements.new));
// Mark all announcements as read
router.get('/mark-all', wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.markAll)); 
// Mark specific announcement as read
router.get('/mark/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.markOne));
// Verify Announcement
router.get('/verify/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isMod), wrapAsync(announcements.verify));

// Like announcement
router.put('/like', wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.likeAnnouncement));
// Comment on announcement
router.put('/like-comment', wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.likeComment));
// Like a comment on announcement
router.put('/comment', wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.comment));

// :ID
router.route('/:id')
    // Show specific announcement
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(announcements.show))
    // Update specific announcement
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.announcementPermission), multipleUpload, wrapAsync(announcements.updateAnnouncement))
    // Delete specific announcement
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.announcementPermission), wrapAsync(announcements.deleteAnnouncement));

// Form to edit specific announcement
router.get('/:id/edit', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.announcementPermission), wrapAsync(announcements.updateForm)); 

module.exports = router;