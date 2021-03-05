const express = require('express');
const middleware = require('../middleware');
const { validateMsg } = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const {multipleUpload} = require('../middleware/multer');
const inbox = require('../controllers/inbox'); //Controller
const router = express.Router(); //Router

//INBOX ACTIONS
router.get('/', middleware.isLoggedIn, wrapAsync(inbox.index)); // Display user inbox
router.get('/messages/new', middleware.isLoggedIn, wrapAsync(inbox.newMsgForm)); // New messsage form
router.get('/sent', middleware.isLoggedIn, wrapAsync(inbox.sent)); // Display sent messages
router.post('/messages', middleware.isLoggedIn, multipleUpload, validateMsg, wrapAsync(inbox.createMsg)); // Create messsage
router.put('/reply', middleware.isLoggedIn, wrapAsync(inbox.reply)); //User can reply to notifications sent to them
router.put('/mark-all', middleware.isLoggedIn, wrapAsync(inbox.markReadAll)); // Mark all messages as read
router.put('/mark-selected', middleware.isLoggedIn, wrapAsync(inbox.markReadSelected)); // Mark selected messages as read
router.delete('/clear', middleware.isLoggedIn, wrapAsync(inbox.clear)); // Clear entire inbox
router.delete('/delete', middleware.isLoggedIn, wrapAsync(inbox.delete)); // Delete messages
router.get('/:id', middleware.isLoggedIn, wrapAsync(inbox.showMsg)); // Message show route

// ACCESS REQUEST ACTIONS
router.get('/requests/:id', middleware.isLoggedIn, wrapAsync(inbox.showReq)); // displays single access request
router.post('/requests/:id/accept', middleware.isLoggedIn, wrapAsync(inbox.acceptReq)); // route to accept request
router.post('/requests/:id/reject', middleware.isLoggedIn, wrapAsync(inbox.rejectReq)); // route to reject request

module.exports = router;