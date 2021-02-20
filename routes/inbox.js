const express = require('express');
const middleware = require('../middleware');
const { validateMsg } = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const {multipleUpload} = require('../middleware/multer');
const Inbox = require('../controllers/inbox'); //Controller
const router = express.Router(); //Router

//INBOX ACTIONS
router.get('/', middleware.isLoggedIn, wrapAsync(Inbox.index)); // Display user Inbox
router.get('/messages/new', middleware.isLoggedIn, wrapAsync(Inbox.newMsgForm)); // New messsage form
router.get('/sent', middleware.isLoggedIn, wrapAsync(Inbox.sent)); // Display sent messages
router.post('/messages', middleware.isLoggedIn, multipleUpload, validateMsg, wrapAsync(Inbox.createMsg)); // Create messsage
router.put('/reply', middleware.isLoggedIn, wrapAsync(Inbox.reply)); //User can reply to notifications sent to them
router.put('/mark-all', middleware.isLoggedIn, wrapAsync(Inbox.markReadAll)); // Mark all messages as read
router.put('/mark-selected', middleware.isLoggedIn, wrapAsync(Inbox.markReadSelected)); // Mark selected messages as read
router.delete('/clear', middleware.isLoggedIn, Inbox.clear); // Clear entire Inbox
router.delete('/delete', middleware.isLoggedIn, wrapAsync(Inbox.delete)); // Delete messages
router.get('/:id', middleware.isLoggedIn, wrapAsync(Inbox.showMsg)); // Message show route

// ACCESS REQUEST ACTIONS
router.get('/requests/:id', middleware.isLoggedIn, wrapAsync(Inbox.showReq)); // displays single access request
router.post('/requests/:id/accept', middleware.isLoggedIn, wrapAsync(Inbox.acceptReq)); // route to accept request
router.post('/requests/:id/reject', middleware.isLoggedIn, wrapAsync(Inbox.rejectReq)); // route to reject request

module.exports = router;