//Announcement routes dictate the posting, viewing, and editing of the Saberchat Announcement Bulletin

//LIBRARIES
const express = require('express');
const middleware = require('../middleware/index');
const {multipleUpload} = require('../middleware/multer');
const {validateAnn} = require('../middleware/validation');
const {validatePostComment} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const Announcement = require('../controllers/announcements'); // Controller
module.exports = express.Router(); //Router

//ROUTES
module.exports.route('/')
    .get(wrapAsync(Announcement.index))
    .post(middleware.isLoggedIn, middleware.isMod, multipleUpload, validateAnn, wrapAsync(Announcement.create));

module.exports.get('/new', middleware.isLoggedIn, middleware.isMod, Announcement.new);
module.exports.get('/mark-all', middleware.isLoggedIn, Announcement.markAll);
module.exports.get('/mark/:id', middleware.isLoggedIn, Announcement.markOne);

module.exports.put('/like', middleware.isLoggedIn, wrapAsync(Announcement.likeAnn));
module.exports.put('/like-comment', middleware.isLoggedIn, wrapAsync(Announcement.likeComment));
module.exports.put('/comment', middleware.isLoggedIn, validatePostComment, wrapAsync(Announcement.comment));

module.exports.route('/:id')
    .get(wrapAsync(Announcement.show))
    .put(middleware.isLoggedIn, middleware.isMod, multipleUpload, wrapAsync(Announcement.updateAnn))
    .delete(middleware.isLoggedIn, middleware.isMod, wrapAsync(Announcement.deleteAnn));

module.exports.get('/:id/edit', middleware.isLoggedIn, middleware.isMod, wrapAsync(Announcement.updateForm));
