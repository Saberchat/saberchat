//Announcement routes dictate the posting, viewing, and editing of the Saberchat Announcement Bulletin

//LIBRARIES
const express = require('express');
const middleware = require('../middleware/index');
const router = express.Router(); //start express router

const {multipleUpload} = require('../middleware/multer');
const {validateAnn} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');

// Controller
const Announcement = require('../controllers/announcements');

//ROUTES
router.route('/')
    .get(wrapAsync(Announcement.index))
    .post(middleware.isLoggedIn, middleware.isMod, multipleUpload, validateAnn, wrapAsync(Announcement.create));

router.get('/new', middleware.isLoggedIn, middleware.isMod, Announcement.new);
router.get('/mark-all', middleware.isLoggedIn, Announcement.markAll);
router.get('/mark/:id', middleware.isLoggedIn, Announcement.markOne);

router.put('/like', middleware.isLoggedIn, wrapAsync(Announcement.likeAnn));
router.put('/like-comment', middleware.isLoggedIn, wrapAsync(Announcement.likeComment));
router.put('/comment', middleware.isLoggedIn, wrapAsync(Announcement.comment));

router.route('/:id')
    .get(wrapAsync(Announcement.show))
    .put(middleware.isLoggedIn, middleware.isMod, multipleUpload, wrapAsync(Announcement.updateAnn))
    .delete(middleware.isLoggedIn, middleware.isMod, wrapAsync(Announcement.deleteAnn));

router.get('/:id/edit', middleware.isLoggedIn, middleware.isMod, wrapAsync(Announcement.updateForm));

module.exports = router; //Export these routes to app.js
