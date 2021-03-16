//Report routes dictate the process of posting to the error bulletin

//LIBRARIES
const express = require('express');
const middleware = require('../middleware/index');
const {multipleUpload} = require('../middleware/multer');
const wrapAsync = require('../utils/wrapAsync');
const reports = require('../controllers/reports'); // Controller
const router = express.Router(); //Router

//ROUTES
router.route('/')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(reports.index)) //Show all reports
    .post(wrapAsync(middleware.isLoggedIn), multipleUpload, wrapAsync(reports.create)); //Create report

router.get('/new', wrapAsync(middleware.isLoggedIn), wrapAsync(reports.new)); //Form to create new report
router.get('/handle/:id', wrapAsync(middleware.isLoggedIn), middleware.isAdmin, wrapAsync(reports.handleReport)); //Handle report

router.put('/like', wrapAsync(middleware.isLoggedIn), wrapAsync(reports.likeReport)); //Like report
router.put('/like-comment', wrapAsync(middleware.isLoggedIn), wrapAsync(reports.likeComment)); //Comment on report
router.put('/comment', wrapAsync(middleware.isLoggedIn), wrapAsync(reports.comment)); //Like comment on report

router.route('/:id')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(reports.show)) //Show specific report
    .put(wrapAsync(middleware.isLoggedIn), multipleUpload, wrapAsync(reports.updateReport)) //Update specific report
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(reports.deleteReport)); //Delete specific report

router.get('/:id/edit', wrapAsync(middleware.isLoggedIn), wrapAsync(reports.updateForm)); //Form to edit specific report

module.exports = router;