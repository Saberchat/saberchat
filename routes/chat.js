const express = require('express');
const Filter = require('bad-words');
const filter = new Filter();
//create express router
const dateFormat = require('dateformat');
const router = express.Router();
const {transport, transport_mandatory} = require("../transport");
const convertToLink = require("../convert-to-link");
const { validateRoom } = require('../middleware/validation');

//import middleware
const middleware = require('../middleware');

//import schemas for db stuff
const Comment = require('../models/comment');
const User = require('../models/user');
const Room = require('../models/room');
const AccessReq = require('../models/accessRequest');

//route for displaying room list
router.get('/', middleware.isLoggedIn, (req, res) => {
  (async() => {

    const rooms = await Room.find({}).populate("creator.id");

    if (!rooms) {
      req.flash('error', 'Unable to find rooms');
      return res.redirect('back');
    }

    let commentObject = {};
    let roomComments;

    for (let room of rooms) {
      roomComments = await Comment.find({room: room._id, status: {$in: ["none", "ignored"]}}).populate("author");
      if (!roomComments) {
        req.flash('error', 'Unable to find comments');
        return res.redirect('back');
      }

      if (roomComments.length == 0) {
        commentObject[room._id.toString()] = null;

      } else {
        for (let i = roomComments.length-1; i >= 0; i -=1) {
          if (roomComments[i].author) {
            commentObject[room._id.toString()] = roomComments[i];
            break;
          }
        }
      }
    }

    const requests = await AccessReq.find({requester: req.user._id, status: "pending"});
    if (!requests) {
      req.flash('error', 'Unable to find access requests');
      return res.redirect('back');
    }

    return res.render('chat/index', {rooms, requests, commentObject});

  })().catch(err => {
    req.flash('error', 'Unable to access Database');
    res.redirect('back');
  });
});

//route for displaying new room form
router.get('/new', middleware.isLoggedIn, (req, res) => {
  User.find({authenticated: true}, (err, foundUsers) => {
    if (err || !foundUsers) {
      req.flash('error', 'Unable to access Database');
      res.redirect('back');
    } else {
      res.render('chat/new', {users: foundUsers});
    }
  });
});

// display chat of certain room
router.get('/:id', middleware.isLoggedIn, middleware.checkIfMember, (req, res) => {
  (async () => {
    const room = await Room.findById(req.params.id);
    if(!room) {
      req.flash('error', 'Could not find room'); return res.redirect('/chat');
    }

    if(!(room.confirmed.includes(req.user._id))) {
      room.confirmed.push(req.user._id);
      await room.save();
    }

    if (req.user.newRoomCount.includes(room._id)) {
      req.user.newRoomCount.splice(req.user.newRoomCount.indexOf(room._id), 1);
      await req.user.save();
    }

    const comments = await Comment.find({ room: room._id }).sort({ _id: -1 }).limit(30)
    .populate({path: 'author', select: ['username', 'imageUrl']});

    res.render('chat/show', {comments: comments, room: room});

  })().catch(err => {
    req.flash('error', 'An error occured');
    res.redirect('/chat');
  });
});

// display edit form
router.get('/:id/edit', middleware.isLoggedIn, middleware.checkRoomOwnership, (req, res) => {
  (async() => {
    const room = await Room.findById(req.params.id);

    if (!room) {
      req.flash('error', "Unable to find room"); return res.redirect('back');
    }

    const users = await User.find({authenticated: true});

    if (!users) {
      req.flash('error', 'Unable to access Database'); return res.redirect('back');
    }

    res.render('chat/edit', {users, room});

  })().catch(err => {
    req.flash('error', "Unable to access database");
    res.redirect('back');
  });
});

// create new rooms
router.post('/', middleware.isLoggedIn, validateRoom, (req, res) => {
  (async() => {

    const rooms = await Room.find({});
    if (!rooms) {
      req.flash('error', "Unable to access data");
      return res.redirect('back');
    }

    let roomCount = 0;
    for (let room of rooms) {
      if (room.creator.id.equals(req.user._id)) {
        roomCount++;
      }
    }
    if (roomCount >= 3) {
      req.flash('error', "You have already created 3 rooms");
      return res.redirect('back');
    }

    const roomObject = {
      name: filter.clean(req.body.name),
      'creator.id': req.user._id,
      'creator.username': req.user.username,
      members: [req.user._id]
    };

    const room = await Room.create(roomObject);
    if (!room) {
      req.flash('error', 'Room could not be created');
      return res.redirect('/chat/new');

    } else {
      if(req.body.type == 'true') {
        for (const user in req.body.check) {
          room.members.push(user);
        }
        room.type = 'private';
      }
      if(req.body.moderate == 'false') {
        room.moderate = false;
      }
      if(req.body.description) {
        room.description = filter.clean(req.body.description);
      }

      room.date = dateFormat(room.created_at, "h:MM TT | mmm d");
      await room.save();

      const members = await User.find({authenticated: true, _id: {$in: room.members}});
      if (!members) {
        req.flash('error', 'Members could not be found');
        return res.redirect('/chat/new');
      }

      for (let member of members) {
        member.newRoomCount.push(room._id);
        member.save();
      }

      return res.redirect('/chat/' + room._id);
    }
  })().catch(err => {
    req.flash('error', 'Group could not be created');
    res.redirect('/chat/new');
  });
});

// leave a room
router.post('/:id/leave', middleware.isLoggedIn, middleware.checkForLeave, (req, res) => {
  (async () => {
    const room = await Room.findById(req.params.id);
    if(!room) {
      req.flash('error', 'Room does not exist'); return res.redirect('back');
    }

    if(room.creator.id.equals(req.user._id)) {
      req.flash('error', 'You cannot leave a room you created');
      return res.redirect('back');
    }

    if (!room.mutable) {
      req.flash('error', 'You cannot leave this room');
      return res.redirect('back');
    }

    const request = await AccessReq.findOne({requester: req.user._id, room: room._id, status: 'accepted'});

    if(request) {
      // will delete past request for now
      await request.remove();
    }

    //remove user from room's member list and confirmed list
    let index = room.members.indexOf(req.user._id);
    room.members.splice(index, 1);
    index = room.confirmed.indexOf(req.user._id);
    room.confirmed.splice(index, 1);
    await room.save();

    req.flash('success', 'You have left ' + room.name);
    res.redirect('/chat');

  })().catch(err => {
    req.flash('Error accessing Database');
    res.redirect('back');
  });
});

// handles access requests
router.post('/:id/request-access', middleware.isLoggedIn, (req, res) => {
  (async () => {
    // find the room
    const foundRoom = await Room.findById(req.params.id);
    // if no found room, exit
    if(!foundRoom) {
      return res.json({error: 'Room does not Exist'});
    }

    if(foundRoom.type == 'public') {
      return res.json({error: 'Room is public'});

    } else if (!foundRoom.mutable) {
      return res.json({error: 'Room does not accept access requests'});
    }

    // find if the request already exists to prevent spam
    const foundReq = await AccessReq.findOne({requester: req.user._id, room: foundRoom._id});

    if(foundReq && foundReq.status != 'pending') {
      return res.json({error: `Request has already been ${foundReq.status}`});

    } else if(foundReq) {
      return res.json({error: 'Identical request has already been sent'});

    } else {

      const request = {
        requester: req.user._id,
        room: foundRoom._id,
        receiver: foundRoom.creator.id
      };

      // create the request and find the room creator
      const [createdReq, roomCreator] = await Promise.all([
        AccessReq.create(request),
        User.findById(foundRoom.creator.id)
      ]);

      if(!createdReq || !roomCreator) {
        return res.json({error: 'An error occurred'});
      }

      await roomCreator.requests.push(createdReq._id);
      roomCreator.save();

      transport(roomCreator, 'New Room Access Request', `<p>Hello ${roomCreator.firstName},</p><p><strong>${req.user.username}</strong> is requesting to join your room, <strong>${foundRoom.name}.</strong></p><p>You can access the full request at https://alsion-saberchat.herokuapp.com</p>`);

      return res.json({success: 'Request for access sent'});
    }

  })().catch(err => {
    req.json({error: 'Cannot access Database'});
  });
});

router.delete('/:id/cancel-request', (req, res) => {
  (async() => {
    const room = await Room.findById(req.params.id).populate("creator.id");
    if (!room) {
      return res.json({error: "Unable to find room"});
    }

    const deletedReq = await AccessReq.deleteOne({room: room._id, requester: req.user._id, status: "pending"});
    if (!deletedReq) {
      return res.json({error: "Unable to find request"});
    }

    room.creator.id.requests.splice(room.creator.id.requests.indexOf(deletedReq._id), 1);
    await room.creator.id.save();

    return res.json({success: "Successfully deleted request"});

  })().catch(err => {
    res.json({error: "Unable to access database"});
  });
});

// handles reports on comments from users
router.put('/comments/:id/report', middleware.isLoggedIn, (req, res) => {
  Comment.findById(req.params.id)
  .populate({path: 'room', select: 'moderate'})
  .exec((err, comment) => {
    if(err || !comment) {
      res.json('Error');
    } else if(!comment.room.moderate) {
      res.json('Reporting Is Disabled');
    } else if(comment.status == 'flagged'){
      res.json('Already Reported');
    } else if(comment.status == 'ignored') {
      res.json('Report Ignored by Mod');
    } else {
      // set status to flagged
      comment.status = 'flagged';
      // remember who flagged it
      comment.statusBy = req.body.user;
      comment.save();
      res.json('Reported');
    }
  });
});

// edit room
router.put('/:id', middleware.isLoggedIn, middleware.checkRoomOwnership, validateRoom, (req, res) => {
  Room.findByIdAndUpdate(req.params.id, {name: filter.clean(req.body.name), description: filter.clean(req.body.description)}, (err, room) => {
    if (err || !room) {
      req.flash('error', 'Unable to access Database');
      res.redirect('back');
    } else {
      if(req.body.type == 'true') {
        for(const rUser in req.body.checkRemove) {
          let index = room.members.indexOf(rUser);
          room.members.splice(index, 1);
          index = room.confirmed.indexOf(rUser);
          room.confirmed.splice(index, 1);
        }
        for(const aUser in req.body.checkAdd) {
          room.members.push(aUser);
        }
        room.type = 'private';
      } else {
        room.type = 'public';
      }

      if(req.body.moderate == 'false') {
        room.moderate = false;
      } else {
        room.moderate = true;
      }

      room.save();
      req.flash('success', 'Updated your group');
      res.redirect('/chat/' + room._id);
    }
  });
});

// delete room
router.delete('/:id/delete', middleware.isLoggedIn, middleware.checkRoomOwnership, (req, res) => {
  (async () => {

    const room = await Room.findById(req.params.id);
    if (!room) {
      req.flash('error', 'A problem occured');
      return res.redirect('back');
    }

    if (!room.mutable) {
      req.flash('error', 'You cannot delete this room');
      return res.redirect('back');
    }

    const deletedRoom = await Room.findByIdAndDelete(req.params.id).populate("members");
    if(!deletedRoom) {req.flash('error', 'A problem occured'); return res.redirect('back');}

    await Promise.all([
      Comment.deleteMany({room: deletedRoom._id}),
      AccessReq.deleteMany({room: deletedRoom._id})
    ]);

    for (let member of deletedRoom.members) {
      if (member.newRoomCount.includes(deletedRoom._id)) {
        member.newRoomCount.splice(member.newRoomCount.indexOf(deletedRoom._id), 1);
        await member.save();
      }
    }

    req.flash('success', 'Deleted room');
    res.redirect('/chat');
  })().catch(err => {
    req.flash('error', 'An error occured');
    res.redirect('back');
  });
});

//export the router with all the routes connected
module.exports = router;
