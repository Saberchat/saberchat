//Report routes dictate the process of posting to the error bulletin

//LIBRARIES
const express = require('express');
const middleware = require('../middleware/index');
const {validatePostComment} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const reports = require('../controllers/reports'); // Controller
const router = express.Router(); //Router

//ROUTES
router.route('/')
    .get(middleware.isLoggedIn, wrapAsync(reports.index))
    .post(middleware.isLoggedIn, wrapAsync(reports.create));

router.get('/new', middleware.isLoggedIn, reports.new);
router.get('/handle/:id', middleware.isLoggedIn, middleware.isAdmin, wrapAsync(reports.handleReport));

router.put('/like', middleware.isLoggedIn, wrapAsync(reports.likeReport));
router.put('/like-comment', middleware.isLoggedIn, wrapAsync(reports.likeComment));
router.put('/comment', middleware.isLoggedIn, wrapAsync(reports.comment));

router.route('/:id')
    .get(middleware.isLoggedIn, wrapAsync(reports.show))
    .put(middleware.isLoggedIn, wrapAsync(reports.updateReport))
    .delete(middleware.isLoggedIn, wrapAsync(reports.deleteReport));

router.get('/:id/edit', middleware.isLoggedIn, wrapAsync(reports.updateForm));

module.exports = router;