//Announcement routes dictate the posting, viewing, and editing of the Saberchat Announcement Bulletin

//LIBRARIES
const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat');

//SCHEMA
const User = require('../models/user');
const Announcement = require('../models/announcement');

//ROUTES
router.get('/', middleware.isLoggedIn, (req, res) => { //RESTful Routing 'INDEX' route
  Announcement.find({}).populate('sender').exec((err, foundAnns) => { //Collects data about all announcements
    if (err || !foundAnns) {
      console.log(err)
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      res.render('announcements/index', {announcements: foundAnns.reverse()}) //Render announcement page with data on all announcements
    }
  })
})


router.get('/new', middleware.isLoggedIn, middleware.isAdmin, (req, res) => { //RESTful Routing 'NEW' route
  res.render('announcements/new');
});

router.get('/:id', middleware.isLoggedIn, (req, res) => { //RESTful Routing 'SHOW' route
  Announcement.findById(req.params.id) //Find only the announcement specified from form
  .populate('sender')
  .exec((err, foundAnn) => { //Get info about the announcement's sender, and then release it to user
    if (err || !foundAnn) {
      req.flash('error', 'Unable to access database');
      res.redirect('back');

    } else {
      res.render('announcements/show', {announcement: foundAnn});
    }
  });
});

router.get('/:id/edit', middleware.isLoggedIn, middleware.isAdmin, (req, res) => { //RESTful Routing 'EDIT' route
  Announcement.findById(req.params.id, (err, foundAnn) => { //Find only the announcement specified from form
    if (err || !foundAnn) {
      req.flash('error', "Unable to access database");
      res.redirect('back');
    } else if(!foundAnn.sender._id.equals(req.user._id)) { //If you did not send the announcement, you cannot edit it (the 'edit' button does not show up if you did not create the announcement, but this is a double-check)
      req.flash('error', 'You do not have permission to do that');
      res.redirect('back');
    } else {
      res.render('announcements/edit', {announcement: foundAnn}); //If no problems, allow the user to edit announcement
    }
  })
})

router.post('/', middleware.isLoggedIn, middleware.isAdmin, (req, res) => { //RESTful Routing 'CREATE' route
  Announcement.create({sender: req.user, subject: req.body.subject, text: req.body.message}, (err, announcement) => { //Create announcement with form data
    if(err || !announcement) {
      req.flash('error', 'Unable to access database');
      return res.redirect('back');
    }

    if (req.body.images) { //If any images were added (if not, the 'images' property is null)
      for(const image in req.body.images) {
        announcement.images.push(req.body.images[image]);
      }
    }
    announcement.date = dateFormat(announcement.created_at, "h:MMTT | mmm d");
    announcement.save();

    req.flash('success', 'Announcement posted to bulletin!');
    res.redirect('/announcements/');
  });
})

router.put('/:id', middleware.isLoggedIn, middleware.isAdmin, (req, res) => { //RESTful Routing 'UPDATE' route
  Announcement.findByIdAndUpdate(req.params.id, {subject: req.body.subject, text: req.body.message}, (err, foundAnn) => { //Update the announcement specified in the form
    if (err || !foundAnn) {
      req.flash('error', "Unable to access database");
      res.redirect('back');

    } else if (!foundAnn.sender._id.equals(req.user._id)) { //If you did not create the announcement, you cannot edit it (triple check, because the 'edit' button is not available, and we do a double check when the user tries to access the edit page )
      req.flash('error', "You can only edit announcements that you have sent.")
      res.redirect('back')

    } else {
      foundAnn.images = []; //Empty image array so that you can fill it with whatever images are added (all images are there, not just new ones)
      if(req.body.images) { //Only add images if any are provided
        for(const image in req.body.images) {
          foundAnn.images.push(req.body.images[image]);
        }
      }

      foundAnn.save();

      req.flash('success', 'Announcement Updated!');
      res.redirect(`/announcements/${foundAnn._id}`);
    }
  })
})

router.delete('/:id', middleware.isLoggedIn, middleware.isAdmin, (req, res) => { // RESTful Routing 'DESTROY' route
  Announcement.findByIdAndDelete(req.params.id, (err, deletedAnn) => { //Delete announcement specified in the form
    if (err || !deletedAnn) {
      console.log(err)
      req.flash('error', "Unable to access database");
      res.redirect('back');

    } else if (deletedAnn.sender._id.toString() != req.user._id.toString()) { //Same thing we did with updating announcements. If you didn't post the announcement, you can't delete it.
      req.flash('error', "You can only delete announcements that you have sent.")
      res.redirect('back')

    } else {
      req.flash('success', 'Announcement Deleted!');
      res.redirect('/announcements/');
    }
  })
})

module.exports = router; //Export these routes to app.js
