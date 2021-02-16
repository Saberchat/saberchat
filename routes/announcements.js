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

router.route('/new')
    .get(middleware.isLoggedIn, middleware.isMod, wrapAsync(Announcement.new));

router.route('/mark-all')
    .get(middleware.isLoggedIn, wrapAsync(Announcement.markAll));

router.route('/mark/:id')
    .get(middleware.isLoggedIn, wrapAsync(Announcement.markOne));

router.route('/like')
    .put(middleware.isLoggedIn, wrapAsync(Announcement.likeAnn));

router.route('/like-comment')
    .put(middleware.isLoggedIn, wrapAsync(Announcement.likeComment));

router.route('/comment')
    .put(middleware.isLoggedIn, wrapAsync(Announcement.comment));

router.route('/:id')
    .get(wrapAsync(Announcement.show))
    .put(middleware.isLoggedIn, middleware.isMod, multipleUpload, wrapAsync(Announcement.updateAnn))
    .delete(middleware.isLoggedIn, middleware.isMod, wrapAsync(Announcement.deleteAnn));

router.route('/:id/edit')
    .get(middleware.isLoggedIn, middleware.isMod, wrapAsync(Announcement.updateForm));
    
module.exports = router; //Export these routes to app.js
