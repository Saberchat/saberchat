const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateFormat')
const User = require('../models/user');
const Announcement = require('../models/announcement');

//Route to render 'sendAnnouncement' page
router.get('/announce', middleware.isLoggedIn, (req, res) => {
  if (req.user.status == 'faculty' || req.user.permission == 'admin') {
    
    Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
      if (err || !foundAnns) {
        req.flash('error', 'Unable to access database')
        res.redirect('back')
      } else {

        res.render('announcements/sendAnnouncement', {announcements: foundAnns.reverse(), announced: false})
      }
    })

  } else {
    req.flash('error', 'Your status does not permit you to send announcements.')
    res.redirect('/announcements')
  }
})

//Route to send announcements to bulletin
router.post('/sendAnnouncement', middleware.isLoggedIn, (req, res) => {
  Announcement.create({sender: req.user, subject: req.body.subject, text: req.body.message}, (err, announcement) => {
    if (req.body.imgUrls != '') {
      announcement.images = req.body.imgUrls.split(', ')
    }
    announcement.date = dateFormat(announcement.created_at, "mmm d, h:MMTT")
    announcement.save()
  })
  req.flash('success', 'Announcement posted to bulletin!')
  res.redirect('/announce')
})


//Route to access bulletin
router.get('/announcements', middleware.isLoggedIn, (req, res) => {
  Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
    if (err || !foundAnns) {
      req.flash('error', 'Unable to access database')
      res.redirect('back')

    } else {
      res.render('announcements/announcements', {announcements: foundAnns.reverse(), announced: false})
    }
  })
})

router.get('/view_announcement/:id', middleware.isLoggedIn, (req, res) => {
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
          res.render('announcements/announcements', {announcements: foundAnns.reverse(), announced: true, announcement: foundAnn})
        }
      })
    }
  })
})

router.get('/delete_announcement/:id', middleware.isLoggedIn, (req, res) => {
  Announcement.findByIdAndDelete(req.params.id, (err, foundAnn) => {
    if (err || !foundAnn) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      req.flash('success', 'Announcement Deleted!')
      res.redirect('/announce')
    }
  })
})

router.get('/edit_announcement/:id', middleware.isLoggedIn, (req, res) => {
  Announcement.findById(req.params.id, (err, foundAnn) => {
    if (err || !foundAnn) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
        if (err || !foundAnns) {
          req.flash('error', 'Unable to access database')
          res.redirect('back')

        } else {

          res.render('announcements/editAnnouncement', {announcements: foundAnns.reverse(), announced: false, announcement: foundAnn})
        }
      })
    }
  })
})

router.post('/submit_announcement_changes/:id', middleware.isLoggedIn, (req, res) => {
  Announcement.findByIdAndUpdate(req.params.id, {subject: req.body.subject, images: req.body.imgUrls.split(', '), text: req.body.message}, (err, foundAnn) => {
    if (err || !foundAnn) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      req.flash('success', 'Announcement Updated!')
      res.redirect(`/view_announcement/${foundAnn._id}`)
    }
  })
})
module.exports = router;
