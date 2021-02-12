const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const { validateMsg } = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const {singleUpload, multipleUpload} = require('../middleware/multer');

// controller
const Inbox = require('../controllers/inbox');

// Display user Inbox
router.get('/', middleware.isLoggedIn, wrapAsync(Inbox.index));

// New messsage form
router.get('/messages/new', middleware.isLoggedIn, wrapAsync(Inbox.newMsgForm));

// Display sent messages
router.get('/sent', middleware.isLoggedIn, wrapAsync(Inbox.sent));

// Create messsage
router.post('/messages', middleware.isLoggedIn, multipleUpload, validateMsg, wrapAsync(Inbox.createMsg));

//User can reply to notifications sent to them
router.put('/reply', middleware.isLoggedIn, wrapAsync(Inbox.reply));

// Mark all messages as read
router.put('/mark-all', middleware.isLoggedIn, wrapAsync(Inbox.markReadAll));

// Mark selected messages as read
router.put('/mark-selected', middleware.isLoggedIn, wrapAsync(Inbox.markReadSelected));

// Clear entire Inbox
router.delete('/clear', middleware.isLoggedIn, Inbox.clear);

// Delete messages
router.delete('/delete', middleware.isLoggedIn, wrapAsync(Inbox.delete));

// Message show route
router.get('/:id', middleware.isLoggedIn, wrapAsync(inbox.showMsg));

// ========================================
// access request routes
// ========================================

// displays single access request
router.get('/requests/:id', middleware.isLoggedIn, wrapAsync(Inbox.showReq));

// route to accept request
router.post('/requests/:id/accept', middleware.isLoggedIn, wrapAsync(Inbox.acceptReq));

// route to reject request
router.post('/requests/:id/reject', middleware.isLoggedIn, wrapAsync(Inbox.rejectReq));

module.exports = router;
