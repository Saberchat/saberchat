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


router.get('/new', middleware.isLoggedIn, middleware.isMod, (req, res) => { //RESTful Routing 'NEW' route
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

      let index = -1;
      for (let i = 0; i < req.user.annCount.length; i += 1) {

        if (foundAnn._id.toString() == req.user.annCount[i].announcement._id.toString()) {
          index = i;
        }
      }

      if (index != -1) {
        req.user.annCount.splice(index, 1)
      }

      req.user.save()
      res.render('announcements/show', {announcement: foundAnn});
    }
  });
});

router.get('/:id/edit', middleware.isLoggedIn, middleware.isMod, (req, res) => { //RESTful Routing 'EDIT' route
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

router.post('/', middleware.isLoggedIn, middleware.isMod, (req, res) => { //RESTful Routing 'CREATE' route
  (async() => {
    const announcement = await Announcement.create({sender: req.user, subject: req.body.subject, text: req.body.message});

    if(!announcement) {
      req.flash('error', 'Unable to create announcement');
      return res.redirect('back');
    }

    if (req.body.images) { //If any images were added (if not, the 'images' property is null)
      for(const image in req.body.images) {
        announcement.images.push(req.body.images[image]);
      }
    }
    announcement.date = dateFormat(announcement.created_at, "h:MMTT | mmm d");
    await announcement.save();

    const users = await User.find({_id: {$nin: [req.user._id]}});

    if (!users) {
      req.flash('error', "Unable to access database");
      res.rediect('back');
    }

    let announcementObject = {
      announcement: announcement,
      version: "new"
    }

    for (let user of users) {
      user.annCount.push(announcementObject);
      await user.save()
    }

    req.flash('success', 'Announcement posted to bulletin!');
    res.redirect(`/announcements/${announcement._id}`);

  })().catch(err => {
    console.log(err);
    req.flash('error', "Unable to access database");
    return res.redirect('back');
  })
})

router.put('/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => { //RESTful Routing 'UPDATE' route
  (async() => {

    const announcement = await Announcement.findById(req.params.id).populate('sender');

    if (!announcement) {
      req.flash('error', "Unable to access announcement");
      return res.redirect('back');
    }

    if (announcement.sender._id.toString() != req.user._id.toString()) {
      req.flash('error', "You can only update announcements which you have sent");
      return res.redirect('back');
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(req.params.id, {subject: req.body.subject, text: req.body.message});
      if (!updatedAnnouncement) {
        req.flash('error', "Unable to update announcement");
        return res.redirect('back');
      }

      updatedAnnouncement.images = []; //Empty image array so that you can fill it with whatever images are added (all images are there, not just new ones)
      if(req.body.images) { //Only add images if any are provided
        for(const image in req.body.images) {
          updatedAnnouncement.images.push(req.body.images[image]);
        }
      }

      await updatedAnnouncement.save();

      const users = await User.find({_id: {$nin: [req.user._id]}});

      if (!users) {
        req.flash('error', "Unable to access database");
        res.rediect('back');
      }

      let announcementObject = {
        announcement: updatedAnnouncement,
        version: "updated"
      }

      let overlap;

      for (let user of users) {
        overlap = false;

        for (let a of user.annCount) {
          if (a.announcement.toString() == updatedAnnouncement._id.toString()) {
            overlap = true;
            break;
          }
        }

        if (!overlap) {
          user.annCount.push(announcementObject);
          await user.save()
        }
      }

      req.flash('success', 'Announcement Updated!');
      res.redirect(`/announcements/${updatedAnnouncement._id}`);

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  })
})

router.delete('/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => { // RESTful Routing 'DESTROY' route
  (async() => {

    const announcement = await Announcement.findById(req.params.id).populate('sender');
    if (!announcement) {
      req.flash('error', "Unable to access announcement");
      return res.redirect('back');
    }

    if (announcement.sender._id.toString() != req.user._id.toString()) {
      req.flash('error', "You can only delete announcements that you have posted")
      return res.redirect('back')

    } else {
      const deletedAnn = await Announcement.findByIdAndDelete(announcement._id);

      if (!deletedAnn) {
        req.flash('error', "Unable to delete announcement");
        return res.redirect('back')
      }

      const users = await User.find({}, (err, users) => {
        if (!users) {
          req.flash('error', "Unable to find users");
          return res.redirect('back')
        }

        for (let user of users) {
          if (user.annCount.includes(deletedAnn._id)) {
            user.annCount.splice(user.annCount.indexOf(deletedAnn._id), 1)
            user.save()
          }
        }
      })

      req.flash('success', 'Announcement Deleted!');
      res.redirect('/announcements/');

    }
  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  })
})

module.exports = router; //Export these routes to app.js
