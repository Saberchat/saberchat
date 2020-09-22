const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat');
const User = require('../models/user');
const Announcement = require('../models/announcement');

//Route to access bulletin
router.get('/', middleware.isLoggedIn, (req, res) => {
  Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
    if (err || !foundAnns) {
      req.flash('error', 'Unable to access database')
      res.redirect('back')

    } else {
      res.render('announcements/index', {announcements: foundAnns.reverse(), announced: false})
    }
  })
})

//Route to render 'sendAnnouncement' page
router.get('/new', [middleware.isLoggedIn, middleware.adminOrFaculty], (req, res) => {
  Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
    if (err || !foundAnns) {
      req.flash('error', 'Unable to access database')
      res.redirect('back')
    } else {

      res.render('announcements/new', {announcements: foundAnns.reverse(), announced: false})
    }
  })
})

//Route to send announcements to bulletin
router.post('/', [middleware.isLoggedIn, middleware.adminOrFaculty], (req, res) => {
  Announcement.create({sender: req.user, subject: req.body.subject, text: req.body.message}, (err, announcement) => {
    if (req.body.imgUrls != '') {
      announcement.images = req.body.imgUrls.split(', ')
    }
    announcement.date = dateFormat(announcement.created_at, "mmm d, h:MMTT")
    announcement.save()

    req.flash('success', 'Announcement posted to bulletin!')
    res.redirect(`/announcements/${announcement._id}`)
  })
})


router.get('/:id', middleware.isLoggedIn, (req, res) => {
  Announcement.findOne({_id: req.params.id}).populate({path: 'sender', select: ['username', 'imageUrl']}).exec((err, foundAnn) => {
    if (err || !foundAnn) {
      console.log(err)
      req.flash('error', 'Problem Unable to access database')
      res.redirect('back')

    } else {

      Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
        if (err || !foundAnns) {
          req.flash('error', 'Unable to access database')
          res.redirect('back')

        } else {
          res.render('announcements/index', {announcements: foundAnns.reverse(), announced: true, announcement: foundAnn})
        }
      })
    }
  })
})

router.get('/:id/edit', [middleware.isLoggedIn, middleware.adminOrFaculty], (req, res) => {
  Announcement.findById(req.params.id, (err, foundAnn) => {
    if (err || !foundAnn) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else if (foundAnn.sender._id != req.user._id) {
      req.flash('error', "You can only edit announcements that you have sent.")
      res.redirect('back')

    } else {
      Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
        if (err || !foundAnns) {
          req.flash('error', 'Unable to access database')
          res.redirect('back')

        } else {

          res.render('announcements/edit', {announcements: foundAnns.reverse(), announced: false, announcement: foundAnn})
        }
      })
    }
  })
})

router.put('/:id', [middleware.isLoggedIn, middleware.adminOrFaculty], (req, res) => {
  Announcement.findByIdAndUpdate(req.params.id, {subject: req.body.subject, images: req.body.imgUrls.split(', '), text: req.body.message}, (err, foundAnn) => {
    if (err || !foundAnn) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else if (foundAnn.sender._id != req.user._id) {
      req.flash('error', "You can only edit announcements that you have sent.")
      res.redirect('back')

    } else {
      req.flash('success', 'Announcement Updated!')
      res.redirect(`/announcements/${foundAnn._id}`)
    }
  })
})

router.delete('/:id', [middleware.isLoggedIn, middleware.adminOrFaculty], (req, res) => {
  Announcement.findByIdAndDelete(req.params.id, (err, foundAnn) => {
    if (err || !foundAnn) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else if (foundAnn.sender._id != req.user._id) {
      req.flash('error', "You can only delete announcements that you have sent.")
      res.redirect('back')

    } else {
      req.flash('success', 'Announcement Deleted!')
      res.redirect('/announcements/new')
    }
  })
})

module.exports = router;
