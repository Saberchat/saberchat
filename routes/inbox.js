const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const { validateMsg } = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const {singleUpload, multipleUpload} = require('../middleware/multer');

// controller
const inbox = require('../controllers/inbox');

// Display user inbox
router.get('/', middleware.isLoggedIn, wrapAsync(inbox.index));

// Message show route
router.get('/:id', middleware.isLoggedIn, wrapAsync(inbox.showMsg));

// New messsage form
router.get('/messages/new', middleware.isLoggedIn, wrapAsync(inbox.newMsgForm));

// Display sent messages
router.get('/sent', middleware.isLoggedIn, wrapAsync(inbox.sent));

// Create messsage
router.post('/messages', middleware.isLoggedIn, multipleUpload, validateMsg, wrapAsync(inbox.createMsg));

//User can reply to notifications sent to them
router.put('/reply', middleware.isLoggedIn, wrapAsync(inbox.reply));

// Mark all messages as read
router.put('/mark-all', middleware.isLoggedIn, wrapAsync(inbox.markReadAll));

// Mark selected messages as read
router.put('/mark-selected', middleware.isLoggedIn, wrapAsync(inbox.markReadSelected));

// Clear entire inbox
router.delete('/clear', middleware.isLoggedIn, inbox.clear);

// Delete messages
router.delete('/delete', middleware.isLoggedIn, wrapAsync(inbox.delete));


// ========================================
// access request routes
// ========================================

// displays single access request
router.get('/requests/:id', middleware.isLoggedIn, wrapAsync(inbox.showReq));

// route to accept request
router.post('/requests/:id/accept', middleware.isLoggedIn, wrapAsync(inbox.acceptReq));

// route to reject request
router.post('/requests/:id/reject', middleware.isLoggedIn, wrapAsync(inbox.rejectReq));

module.exports = router;
