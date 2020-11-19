const express = require('express');
const Filter = require('bad-words');
const filter = new Filter();
//create express router
const router = express.Router();
const nodemailer = require('nodemailer');

//import middleware
const middleware = require('../middleware');

//import schemas for db stuff
const Comment = require('../models/comment');
const User = require('../models/user');
const Room = require('../models/room');
const AccessReq = require('../models/accessRequest');


let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'noreply.saberchat@gmail.com',
    pass: 'Tgy8erwIYtxRZrJHvKwkWbrkbUhv1Zr9'
  }
});

//route for displaying room list
router.get('/', middleware.isLoggedIn, (req, res) => {
  Room.find({}, (err, foundRooms) => {
    if (err || !foundRooms) {
      req.flash('error', 'Unable to access Database');
      res.redirect('back');
    } else {
      res.render('chat/index', {rooms: foundRooms});
    }
  });
});

//route for displaying new room form
router.get('/new', middleware.isLoggedIn, (req, res) => {
  User.find({}, (err, foundUsers) => {
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

    const users = await User.find({});

    if (!users) {
      req.flash('error', 'Unable to access Database'); return res.redirect('back');
    }

    res.render('chat/edit', {users, room});

  })().catch(err => {
    console.log(err);
    req.flash('error', "Unable to access database");
    res.redirect('back');
  });
});

// create new rooms
router.post('/', middleware.isLoggedIn, (req, res) => {
  const room = {
    name: filter.clean(req.body.name),
    'creator.id': req.user._id,
    'creator.username': req.user.username,
    members: [req.user._id]
  };

  Room.create(room, (err, room) => {
    if (err) {
      console.log(err);
      req.flash('error', 'group could not be created');
      res.redirect('/chat/new');
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
      room.save();
      console.log('Database Room created: '.cyan);
      console.log(room);
      res.redirect('/chat/' + room._id);
    }
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
    console.log(err);
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
      req.flash('error', 'Room does not Exist'); return res.redirect('back');
    }

    if(foundRoom.type == 'public') {
      req.flash('error', 'Room is public');
      return res.redirect('back');
    }

    // find if the request already exists to prevent spam
    const foundReq = await AccessReq.findOne({requester: req.user._id, room: foundRoom._id});

    if(foundReq && foundReq.status != 'pending') {
      req.flash('error', 'Request has already been ' + foundReq.status);
      res.redirect('back');

    } else if(foundReq) {
      req.flash('error', 'Identical request has already been sent');
      res.redirect('back');

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
        req.flash('error', 'An error occured'); return res.redirect('back');
      }

      roomCreator.requests.push(createdReq._id);
      roomCreator.save();

      let requestEmail = {
				from: 'noreply.saberchat@gmail.com',
				to: roomCreator.email,
				subject: `New Room Access Request`,
				html: `<p>Hello ${roomCreator.firstName},</p><p><strong>${req.user.username}</strong> is requesting to join your room, <strong>${foundRoom.name}.</strong></p><p>You can access the full request at https://alsion-saberchat.herokuapp.com</p>`
			};

			transporter.sendMail(requestEmail, (err, info) => {
				if (err) {
					console.log(err);
				} else {
					console.log('Email sent: ' + info.response);
				}
			});

      req.flash('success', 'Request for access sent');
      res.redirect('back');
    }

  })().catch(err => {
    console.log(err)
    req.flash('error', 'Cannot access Database');
    res.redirect('back');
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
router.put('/:id', middleware.isLoggedIn, middleware.checkRoomOwnership, (req, res) => {
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
    const deletedRoom = await Room.findByIdAndDelete(req.params.id);
    if(!deletedRoom) {req.flash('error', 'A problem occured'); return res.redirect('back');}

    await Promise.all([
      Comment.deleteMany({room: deletedRoom._id}),
      AccessReq.deleteMany({room: deletedRoom._id})
    ]);

    req.flash('success', 'Deleted room');
    res.redirect('/chat');
  })().catch(err => {
    req.flash('error', 'An error occured');
    res.redirect('back');
  });
});

//export the router with all the routes connected
module.exports = router;
