const express = require('express');
const middleware = require('../middleware');
const { validateMsg } = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const {multipleUpload} = require('../middleware/multer');
const Inbox = require('../controllers/inbox'); //Controller
module.exports = express.Router(); //Router

//INBOX ACTIONS
module.exports.get('/', middleware.isLoggedIn, wrapAsync(Inbox.index)); // Display user Inbox
module.exports.get('/messages/new', middleware.isLoggedIn, wrapAsync(Inbox.newMsgForm)); // New messsage form
module.exports.get('/sent', middleware.isLoggedIn, wrapAsync(Inbox.sent)); // Display sent messages
module.exports.post('/messages', middleware.isLoggedIn, multipleUpload, validateMsg, wrapAsync(Inbox.createMsg)); // Create messsage
module.exports.put('/reply', middleware.isLoggedIn, wrapAsync(Inbox.reply)); //User can reply to notifications sent to them
module.exports.put('/mark-all', middleware.isLoggedIn, wrapAsync(Inbox.markReadAll)); // Mark all messages as read
module.exports.put('/mark-selected', middleware.isLoggedIn, wrapAsync(Inbox.markReadSelected)); // Mark selected messages as read
module.exports.delete('/clear', middleware.isLoggedIn, Inbox.clear); // Clear entire Inbox
module.exports.delete('/delete', middleware.isLoggedIn, wrapAsync(Inbox.delete)); // Delete messages
module.exports.get('/:id', middleware.isLoggedIn, wrapAsync(Inbox.showMsg)); // Message show route

// ACCESS REQUEST ACTIONS
module.exports.get('/requests/:id', middleware.isLoggedIn, wrapAsync(Inbox.showReq)); // displays single access request
module.exports.post('/requests/:id/accept', middleware.isLoggedIn, wrapAsync(Inbox.acceptReq)); // route to accept request
module.exports.post('/requests/:id/reject', middleware.isLoggedIn, wrapAsync(Inbox.rejectReq)); // route to reject request
