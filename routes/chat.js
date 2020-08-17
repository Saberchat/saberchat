const express = require('express');

//create express router
const router = express.Router();

//import middleware
const middleware = require('../middleware');

//import comment schema for db stuff
const Comment = require('../models/comment');
const User = require('../models/user');
const Room = require('../models/room');

//route for displaying chats
router.get('/chat', middleware.isLoggedIn, (req, res) => {
  Room.find({}, function(err, foundRooms) {
    if (err || !foundRooms) {
      req.flash('error', 'Unable to access Database');
      res.redirect('back');
    } else {
      res.render('chat/index', {
        rooms: foundRooms
      });
    }
  });
});

//route for desplaying new room form
router.get('/chat/new', middleware.isLoggedIn, (req, res) => {
  User.find({}, function(err, foundUsers) {
    if (err || !foundUsers) {
      req.flash('error', 'Unable to access Database');
      res.redirect('back');
    } else {
      res.render('chat/new', {
        users: foundUsers
      });
    }
  });
});

// stuff for /chat route. Middleware makes sure user is logged in and allowed in chat group.
router.get('/chat/:id', middleware.isLoggedIn, middleware.checkIfMember, (req, res) => {
  Room.findById(req.params.id, function(err, foundRoom) {
    if (err) {
      console.log(err);
      req.flash('error', 'Could not find group');
      res.redirect('/chat');
    } else {
      //finds latest 30 comments in the db with matchin room#. This one's a bit monstrous
      Comment.find({
        room: foundRoom._id
      }).sort({
        _id: -1
      }).limit(30).populate('author').exec(function(err, foundComments) {
        if (err) {
          //log error and flash message if it can't access the comments in db
          console.log(err);
          req.flash('error', 'Comments could not be loaded');
        } else {
          if (!foundComments) {
            //if there are no comments in db
            console.log('no found comments!');
          }
          // console.log(foundComments);
          //renders views/chat/index.ejs and passes in data
          res.render('chat/show', {
            comments: foundComments,
            room: foundRoom
          });
        }
      });
    }
  });

});

// route for creating new rooms
router.post('/chat/new', middleware.isLoggedIn, function(req, res) {
  Room.create({name: req.body.name, 'creator.id': req.user._id, 'creator.username': req.user.username, members: [req.user._id]}, function(err, room) {
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
        room.description = req.body.description;
      }
      room.save()
      console.log('Database Room created: '.cyan);
      console.log(room);
      res.redirect('/chat/' + room._id);
    }
  });
});

router.get('/chat/:id/edit', middleware.isLoggedIn, middleware.checkRoomOwnership, (req, res) => {
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
          res.render('chat/edit', {
            users: foundUsers,
            room: foundRoom
          });
        }
      }); 
    }
  });
});



router.put('/chat/:id/edit', middleware.isLoggedIn, middleware.checkRoomOwnership, (req, res) => {
  Room.findByIdAndUpdate(req.params.id, req.body.room, function(err, room) {
    if (err || !room) {
      req.flash('error', 'Unable to access Database');
      res.redirect('back');
    } else {
      if(req.body.type == 'true') {
        for(const rUser in req.body.checkRemove) {
          let index = room.members.indexOf(rUser);
          room.members.splice(index, 1);
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

router.delete('/chat/:id/delete', middleware.isLoggedIn, middleware.checkRoomOwnership, (req, res) => {
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
