// Chat rooms routes control the creation and management of rooms and comments
const express = require('express');
const middleware = require('../middleware');
const {singleUpload} = require('../middleware/multer'); // media upload service
const {validateRoom} = require('../middleware/validation'); // backend validation
const wrapAsync = require('../utils/wrapAsync');
const chat = require('../controllers/chat'); // Import Controller functions
const router = express.Router(); // Initialize Express Router

router.route('/')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(chat.index)) //Show index of chat rooms
    .post(wrapAsync(middleware.isLoggedIn), singleUpload, validateRoom, wrapAsync(chat.createRoom)); //Create new chat room

router.get('/new', wrapAsync(middleware.isLoggedIn), wrapAsync(chat.newRoom)); //Form to create new chat room

router.route('/:id')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.checkIfMember), wrapAsync(chat.showRoom)) //View specific chat room
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.checkRoomOwnership), singleUpload, validateRoom, wrapAsync(chat.updateRoom)) //Update specific chat room
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.checkRoomOwnership), wrapAsync(chat.deleteRoom)) //Delete specific chat room

router.get('/:id/people', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.checkIfMember), wrapAsync(chat.showMembers)); //Show people in a chat room
router.get('/:id/edit', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.checkRoomOwnership), wrapAsync(chat.editRoom)); //Form to edit chat room's settings

router.post('/:id/leave', wrapAsync(middleware.isLoggedIn), middleware.checkForLeave, wrapAsync(chat.leaveRoom)); //Leave chat room

router.route('/:id/request')
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(chat.requestJoin)) //Request to join chat room
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(chat.requestCancel)); //Cancel chat room join request

router.put('/comments/:id/report', wrapAsync(middleware.isLoggedIn), wrapAsync(chat.reportComment)); //Report a comment

module.exports = router; // Export chat router