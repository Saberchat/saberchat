// Chat rooms routes control the creation and management of rooms and comments
const express = require('express');
const middleware = require('../middleware');
const {validateRoom} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const chat = require('../controllers/chat'); //Controller
const router = express.Router(); //Router

router.route('/')
    .get(middleware.isLoggedIn, wrapAsync(chat.index))
    .post(middleware.isLoggedIn, validateRoom, wrapAsync(chat.createRoom));

router.get('/new', middleware.isLoggedIn, wrapAsync(chat.newRoom));

router.route('/:id')
    .get(middleware.isLoggedIn, wrapAsync(middleware.checkIfMember), wrapAsync(chat.showRoom))
    .put(middleware.isLoggedIn, wrapAsync(middleware.checkRoomOwnership), validateRoom, wrapAsync(chat.updateRoom))
    .delete(middleware.isLoggedIn, wrapAsync(middleware.checkRoomOwnership), wrapAsync(chat.deleteRoom))

router.get('/:id/people', middleware.isLoggedIn, wrapAsync(middleware.checkIfMember), wrapAsync(chat.showMembers));
router.get('/:id/edit', middleware.isLoggedIn, wrapAsync(middleware.checkRoomOwnership), wrapAsync(chat.editRoom));

router.post('/:id/leave', middleware.isLoggedIn, middleware.checkForLeave, wrapAsync(chat.leaveRoom));

router.route('/:id/request')
    .post(middleware.isLoggedIn, wrapAsync(chat.requestJoin))
    .delete(middleware.isLoggedIn, wrapAsync(chat.requestCancel));

router.put('/comments/:id/report', middleware.isLoggedIn, wrapAsync(chat.reportComment));

module.exports = router;