const express = require('express');
const Filter = require('bad-words');
const filter = new Filter();
//create express router
const router = express.Router();

//import middleware
const middleware = require('../middleware');

//import schemas for db stuff
const Comment = require('../models/comment');
const User = require('../models/user');
const Room = require('../models/room');
const Announcement = require('../models/announcement');
const AccessReq = require('../models/accessRequest');

//route for displaying room list
router.get('/', middleware.isLoggedIn, (req, res) => {
  Room.find({}, function(err, foundRooms) {
    if (err || !foundRooms) {
      req.flash('error', 'Unable to access Database');
      res.redirect('back');
    } else {

      Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
        if (err || !foundAnns) {
          req.flash('error', 'Unable to access database')
          res.redirect('back')
        } else {
          res.render('chat/index', {rooms: foundRooms, announcements: foundAnns, announced: false})
        }
      })
    }
  });
});

//route for desplaying new room form
router.get('/new', middleware.isLoggedIn, (req, res) => {
  User.find({}, function(err, foundUsers) {
    if (err || !foundUsers) {
      req.flash('error', 'Unable to access Database');
      res.redirect('back');
    } else {

      Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
        if (err || !foundAnns) {
          req.flash('error', 'Unable to access database')
          res.redirect('back')
        } else {
          res.render('chat/new', {users: foundUsers, announcements: foundAnns, announced: false})
        }
      })
    }
  });
});

// display chat of certain room
router.get('/:id', middleware.isLoggedIn, middleware.checkIfMember, (req, res) => {
  Room.findById(req.params.id, function(err, foundRoom) {
    if (err) {
      console.log(err);
      req.flash('error', 'Could not find group');
      res.redirect('/chat');
    } else {
      // if the user has not entered the room before, remember that they now have
      if(!(foundRoom.confirmed.includes(req.user._id))) {
        foundRoom.confirmed.push(req.user._id);
        foundRoom.save();
      }
      //finds latest 30 comments in the db with matchin room#. This one's a bit monstrous
      Comment.find({
        room: foundRoom._id // filter by room id
      }).sort({
        _id: -1 // get by newest
      }).limit(30) // limit by 30
      .populate({path: 'author', select: ['username', 'imageUrl']}) // populate author's username and prof pic
      .exec(function(err, foundComments) {
        if (err) {
          //log error and flash message if it can't access the comments in db
          console.log(err);
          req.flash('error', 'Comments could not be loaded');
        } else {
          if (!foundComments) {
            //if there are no comments in db
            console.log('no found comments!');
          }
          //renders views/chat/index.ejs and passes in data

          Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
            if (err || !foundAnns) {
              req.flash('error', 'Unable to access database')
              res.redirect('back')
            } else {
              res.render('chat/show', {announcements: foundAnns, announced: false, comments: foundComments, room: foundRoom})
            }
          })
        }
      });
    }
  });
});

// display edit form
router.get('/:id/edit', middleware.isLoggedIn, middleware.checkRoomOwnership, (req, res) => {
  Room.findById(req.params.id, function(err, foundRoom) {
    if (err || !foundRoom) {
      req.flash('error', 'Cannot find room or unable to access Database');
      res.redirect('back');
    } else {
      User.find({}, function(err, foundUsers) {
        if (err || !foundUsers) {
          req.flash('error', 'Unable to access Database');
          res.redirect('back');
        } else {
          Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
            if (err || !foundAnns) {
              req.flash('error', 'Unable to access database')
              res.redirect('back')
            } else {
              res.render('chat/edit', {users: foundusers, room: foundRoom, announcements: foundAnns, announced: false})
            }
          })
        }
      });
    }
  });
});

// create new rooms
router.post('/new', middleware.isLoggedIn, function(req, res) {
  Room.create({name: filter.clean(req.body.name), 'creator.id': req.user._id, 'creator.username': req.user.username, members: [req.user._id]}, function(err, room) {
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
      if(req.body.description) {
        room.description = filter.clean(req.body.description);
      }
      room.save()
      console.log('Database Room created: '.cyan);
      console.log(room);
      res.redirect('/chat/' + room._id);
    }
  });
});

// leave a room
router.post('/:id/leave', middleware.isLoggedIn, middleware.checkForLeave, function(req, res) {
  Room.findById(req.params.id, function(err, foundRoom) {
    if(err) {
      console.log(err);
      req.flash('error', 'Error accessing Database');
      res.redirect('back');
    } else {
      if(foundRoom.creator.id.equals(req.user._id)) {
        req.flash('error', 'You cannot leave a room you created');
        res.redirect('back');
      } else {
        //remove user from room's member list and confirmed list
        let index = foundRoom.members.indexOf(req.user._id);
        foundRoom.members.splice(index, 1);
        index = foundRoom.confirmed.indexOf(req.user._id);
        foundRoom.confirmed.splice(index, 1);

        foundRoom.save();

        req.flash('success', 'You have left ' + foundRoom.name);
        res.redirect('/chat');
      }
    }
  });
});

// handles access requests
router.post('/:id/request-access', middleware.isLoggedIn, function(req, res) {
  async function handleRequest() {
    // find the room
    const foundRoom = await Room.findById(req.params.id);
    // if no found room, exit
    if(!foundRoom) {req.flash('error', 'Room does not Exist'); return res.redirect('back');}
    
    // find if the request already exists to prevent spam
    const foundReq = await AccessReq.findOne({requester: req.user._id, room: foundRoom._id});

    if(foundReq) {
      req.flash('error', 'Identical request has already been sent');
      res.redirect('back');
    } else {
      
      const request = {
        requester: req.user._id,
        room: foundRoom._id
      }
      // create the request and find the room creator
      const [createdReq, roomCreator] = await Promise.all([
        AccessReq.create(request),
        User.findById(foundRoom.creator.id)
      ]);

      if(!createdReq || !roomCreator) {req.flash('error', 'An error occured'); return res.redirect('back');}

      roomCreator.requests.push(createdReq._id);
      roomCreator.save();

      req.flash('success', 'Request for access sent');
      res.redirect('back');
    }

  }

  handleRequest().catch(err => {
    req.flash('error', 'Cannot access Database');
    res.redirect('back');
  });
});

// handles reports on comments from users
router.put('/comments/report', middleware.isLoggedIn, function(req, res) {
  Comment.findById(req.body.comment, function(err, comment) {
    if(err) {
      res.json('Error');
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
router.put('/:id/edit', middleware.isLoggedIn, middleware.checkRoomOwnership, (req, res) => {
  Room.findByIdAndUpdate(req.params.id, {name: filter.clean(req.body.name), description: filter.clean(req.body.description)}, function(err, room) {
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

      room.save()
      req.flash('success', 'Updated your group');
      res.redirect('/chat/' + room._id);
    }
  });
  // res.send(req.params.id + " " + req.body.newname);
});

// delete room
router.delete('/:id/delete', middleware.isLoggedIn, middleware.checkRoomOwnership, (req, res) => {
  Room.findByIdAndDelete(req.params.id, function(err, deletedRoom) {
    if(err || !deletedRoom) {
      console.log(err);
      req.flash('error', 'A Problem Occured');
      res.redirect('back');
    } else {
      Comment.deleteMany({room: deletedRoom._id}, function(err, result) {
        if(err) {
          console.log(err);
          req.flash('error', 'Group comments could not be deleted')
          res.redirect('/chat');
        } else {
          req.flash('success', 'Successfully deleted group');
          res.redirect('/chat');
        }
      });
    }
  });
});

//export the router with all the routes connected
module.exports = router;
