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
    .get(middleware.isLoggedIn, wrapAsync(reports.index)) //Show all reports
    .post(middleware.isLoggedIn, wrapAsync(reports.create)); //Create report

router.get('/new', middleware.isLoggedIn, reports.new); //Form to create new report
router.get('/handle/:id', middleware.isLoggedIn, middleware.isAdmin, wrapAsync(reports.handleReport)); //Handle report

router.put('/like', middleware.isLoggedIn, wrapAsync(reports.likeReport)); //Like report
router.put('/like-comment', middleware.isLoggedIn, wrapAsync(reports.likeComment)); //Comment on report
router.put('/comment', middleware.isLoggedIn, wrapAsync(reports.comment)); //Like comment on report

router.route('/:id')
    .get(middleware.isLoggedIn, wrapAsync(reports.show)) //Show specific report
    .put(middleware.isLoggedIn, wrapAsync(reports.updateReport)) //Update specific report
    .delete(middleware.isLoggedIn, wrapAsync(reports.deleteReport)); //Delete specific report

router.get('/:id/edit', middleware.isLoggedIn, wrapAsync(reports.updateForm)); //Form to edit specific report

module.exports = router;