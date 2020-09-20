const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat');
const User = require('../models/user');
const Announcement = require('../models/announcement');

//Route to access bulletin
// router.get('/', middleware.isLoggedIn, (req, res) => {
//   Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
//     if (err || !foundAnns) {
//       req.flash('error', 'Unable to access database')
//       res.redirect('back')

//     } else {
//       res.render('announcements/index', {announcements: foundAnns.reverse(), announced: false})
//     }
//   })
// })

// display create form
router.get('/new', middleware.isLoggedIn, middleware.isAdmin, (req, res) => {
    Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
      if (err || !foundAnns) {
        req.flash('error', 'Unable to access database');
        res.redirect('back');
      } else {

        res.render('announcements/new', {announcements: foundAnns.reverse(), announced: false});
      }
    });
});

// show announcement
router.get('/:id', middleware.isLoggedIn, (req, res) => {
  Announcement.findOne({_id: req.params.id})
  .populate({path: 'sender', select: 'username'})
  .exec((err, foundAnn) => {
    if (err || !foundAnn) {
      req.flash('error', 'Unable to access database');
      res.redirect('back');

    } else {
      res.render('announcements/index', {announced: true, announcement: foundAnn});
    }
  });
});

// display edit form
router.get('/:id/edit', middleware.isLoggedIn, middleware.isAdmin, (req, res) => {
  Announcement.findById(req.params.id, (err, foundAnn) => {
    if (err || !foundAnn) {
      req.flash('error', "Unable to access database");
      res.redirect('back');

    } else {
      res.render('announcements/edit', {announcement: foundAnn});
    }
  })
})

// create announcement
router.post('/create', middleware.isLoggedIn, middleware.isAdmin, (req, res) => {
  Announcement.create({sender: req.user, subject: req.body.subject, text: req.body.message}, (err, announcement) => {
    if(err || !announcement) {
      req.flash('error', 'Unable to access database');
      return res.redirect('back');
    }
    if (req.body.imgUrls != '') {
      announcement.images = req.body.imgUrls.split(', ');
    }
    announcement.date = dateFormat(announcement.created_at, "mmm d, h:MMTT");
    announcement.save();

    req.flash('success', 'Announcement posted to bulletin!');
    res.redirect('/announcements/new');
  });
})

// edit announcement
router.put('/:id', middleware.isLoggedIn, middleware.isAdmin, (req, res) => {
  Announcement.findByIdAndUpdate(req.params.id, {subject: req.body.subject, images: req.body.imgUrls.split(', '), text: req.body.message}, (err, foundAnn) => {
    if (err || !foundAnn) {
      req.flash('error', "Unable to access database");
      res.redirect('back');

    } else {
      req.flash('success', 'Announcement Updated!');
      res.redirect(`/announcements/show/${foundAnn._id}`);
    }
  })
})

// delete announcement
router.delete('/:id', middleware.isLoggedIn, middleware.isAdmin, (req, res) => {
  Announcement.findByIdAndDelete(req.params.id, (err, deletedAnn) => {
    if (err || !deletedAnn) {
      req.flash('error', "Unable to access database");
      res.redirect('back');

    } else {
      req.flash('success', 'Deleted');
      res.redirect('/announcements/new');
    }
  })
})

module.exports = router;
