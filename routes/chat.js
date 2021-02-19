// Chat rooms routes control the creation and management of rooms and comments
const express = require('express');
const middleware = require('../middleware');
const {validateRoom} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const chat = require('../controllers/chat'); //Controller
module.exports = express.Router(); //Router

module.exports.route('/')
    .get(middleware.isLoggedIn, wrapAsync(chat.index))
    .post(middleware.isLoggedIn, validateRoom, wrapAsync(chat.createRoom));

module.exports.get('/new', middleware.isLoggedIn, wrapAsync(chat.newRoom));

module.exports.route('/:id')
    .get(middleware.isLoggedIn, wrapAsync(middleware.checkIfMember), wrapAsync(chat.showRoom))
    .put(middleware.isLoggedIn, wrapAsync(middleware.checkRoomOwnership), validateRoom, wrapAsync(chat.updateRoom))
    .delete(middleware.isLoggedIn, wrapAsync(middleware.checkRoomOwnership), wrapAsync(chat.deleteRoom))

module.exports.get('/:id/people', middleware.isLoggedIn, wrapAsync(middleware.checkIfMember), wrapAsync(chat.showMembers));
module.exports.get('/:id/edit', middleware.isLoggedIn, wrapAsync(middleware.checkRoomOwnership), wrapAsync(chat.editRoom));

module.exports.post('/:id/leave', middleware.isLoggedIn, middleware.checkForLeave, wrapAsync(chat.leaveRoom));

module.exports.route('/:id/request')
    .post(middleware.isLoggedIn, wrapAsync(chat.requestJoin))
    .delete(middleware.isLoggedIn, wrapAsync(chat.requestCancel));

module.exports.put('/comments/:id/report', middleware.isLoggedIn, wrapAsync(chat.reportComment));
