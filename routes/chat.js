// Chat room routes

const express = require('express');
const middleware = require('../middleware');
const {validateRoom} = require('../middleware/validation');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync');
const controller = require('../controllers/chat');

router.route('/')
    .get(middleware.isLoggedIn, wrapAsync(controller.index))
    .post(middleware.isLoggedIn, validateRoom, wrapAsync(controller.createRoom));

router.route('/:id')
    .get(middleware.isLoggedIn, wrapAsync(middleware.checkIfMember), wrapAsync(controller.showRoom))
    .put(middleware.isLoggedIn, wrapAsync(middleware.checkRoomOwnership), validateRoom, wrapAsync(controller.updateRoom))
    .delete(middleware.isLoggedIn, wrapAsync(middleware.checkRoomOwnership), wrapAsync(controller.deleteRoom))

router.get('/new', middleware.isLoggedIn, wrapAsync(controller.newRoom));
router.get('/:id/people', middleware.isLoggedIn, wrapAsync(middleware.checkIfMember), wrapAsync(controller.showMembers));
router.get('/:id/edit', middleware.isLoggedIn, wrapAsync(middleware.checkRoomOwnership), wrapAsync(controller.editRoom));

router.post('/:id/leave', middleware.isLoggedIn, middleware.checkForLeave, wrapAsync(controller.leaveRoom));

router.route('/:id/request')
    .post(middleware.isLoggedIn, wrapAsync(controller.requestJoin))
    .delete(middleware.isLoggedIn, wrapAsync(controller.requestCancel));

router.put('/comments/:id/report', middleware.isLoggedIn, wrapAsync(controller.reportComment));

module.exports = router;
