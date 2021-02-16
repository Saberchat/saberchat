const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const { validateMsg } = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const {multipleUpload} = require('../middleware/multer');

// controller
const Inbox = require('../controllers/inbox');

// Display user Inbox
router.route('/')
    .get(middleware.isLoggedIn, wrapAsync(Inbox.index));

// New messsage form
router.route('/messages/new')
    .get(middleware.isLoggedIn, wrapAsync(Inbox.newMsgForm));

// Display sent messages
router.route('/sent')
    .get(middleware.isLoggedIn, wrapAsync(Inbox.sent));

// Create messsage
router.route('/messages')
    .post(middleware.isLoggedIn, multipleUpload, validateMsg, wrapAsync(Inbox.createMsg));

//User can reply to notifications sent to them
router.route('/reply')
    .put(middleware.isLoggedIn, wrapAsync(Inbox.reply));

// Mark all messages as read
router.route('/mark-all')
    .put(middleware.isLoggedIn, wrapAsync(Inbox.markReadAll));

// Mark selected messages as read
router.route('/mark-selected')
    .put(middleware.isLoggedIn, wrapAsync(Inbox.markReadSelected));

// Clear entire Inbox
router.route('/clear')
    .delete(middleware.isLoggedIn, Inbox.clear);

// Delete messages
router.route('/delete')
    .delete(middleware.isLoggedIn, wrapAsync(Inbox.delete));

// Message show route
router.route('/:id')
    .get(middleware.isLoggedIn, wrapAsync(Inbox.showMsg));

// ACCESS REQUESTS

// displays single access request
router.route('/requests/:id')
    .get(middleware.isLoggedIn, wrapAsync(Inbox.showReq));

// route to accept request
router.route('/requests/:id/accept')
    .post(middleware.isLoggedIn, wrapAsync(Inbox.acceptReq));

// route to reject request
router.route('/requests/:id/reject')
    .post(middleware.isLoggedIn, wrapAsync(Inbox.rejectReq));

module.exports = router;
