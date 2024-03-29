const express = require('express');
const middleware = require('../middleware');
const { validateMsg } = require('../middleware/validation'); // Backend validation
const wrapAsync = require('../utils/wrapAsync');
const {multipleUpload} = require('../middleware/multer'); // Media upload
const inbox = require('../controllers/inbox'); // Import Controller functions
const router = express.Router(); // Initialize Express Router

//INBOX ACTIONS
router.get('/', wrapAsync(middleware.isLoggedIn), wrapAsync(inbox.index)); // Display user inbox
router.get('/messages/new', wrapAsync(middleware.isLoggedIn), wrapAsync(inbox.newMsgForm)); // New messsage form
router.get('/sent', wrapAsync(middleware.isLoggedIn), wrapAsync(inbox.sent)); // Display sent messages
router.get('/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(inbox.showMsg)); // Message show route

router.post('/search-recipients', wrapAsync(middleware.isLoggedIn), wrapAsync(inbox.searchRecipients)); //Search for recipients in inbox create form
router.post('/messages', wrapAsync(middleware.isLoggedIn), multipleUpload, validateMsg, wrapAsync(inbox.createMsg)); // Create messsage

router.put('/reply/:id', wrapAsync(middleware.isLoggedIn), multipleUpload, wrapAsync(inbox.reply)); //User can reply to notifications sent to them
router.put('/mark-all', wrapAsync(middleware.isLoggedIn), wrapAsync(inbox.markReadAll)); // Mark all messages as read
router.put('/mark-selected', wrapAsync(middleware.isLoggedIn), wrapAsync(inbox.markReadSelected)); // Mark selected messages as read

router.delete('/clear', wrapAsync(middleware.isLoggedIn), wrapAsync(inbox.clear)); // Clear entire inbox
router.delete('/delete', wrapAsync(middleware.isLoggedIn), wrapAsync(inbox.delete)); // Delete messages

// ACCESS REQUEST ACTIONS
router.get('/requests/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(inbox.showReq)); // displays single access request
router.post('/requests/:id/accept', wrapAsync(middleware.isLoggedIn), wrapAsync(inbox.acceptReq)); // route to accept request
router.post('/requests/:id/reject', wrapAsync(middleware.isLoggedIn), wrapAsync(inbox.rejectReq)); // route to reject request

module.exports = router; // export Inbox router