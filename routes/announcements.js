const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const User = require('../models/user');
const Announcement = require('../models/announcement');

//Route to render 'sendAnnouncement' page
router.get('/announce', middleware.isLoggedIn, (req, res) => {
  if (req.user.permission == 'teacher' || req.user.permission == 'admin') {
    Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
      if (err || !foundAnns) {
        req.flash('error', 'Unable to access database')
        res.redirect('back')
      } else {
        res.render('announcements/sendAnnouncement', {announcements: foundAnns, announced: false})
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
      res.render('announcements/announcements', {announcements: foundAnns, announced: false})
    }
  })
})

router.get('/view_announcement', middleware.isLoggedIn, (req, res) => {
  Announcement.findOne({_id: req.query.id}).populate({path: 'sender', select: ['username', 'imageUrl']}).exec((err, foundAnn) => {
    if (err || !foundAnn) {
      req.flash('error', 'Unable to access database')
      res.redirect('back')

    } else {

      Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
        if (err || !foundAnns) {
          req.flash('error', 'Unable to access database')
          res.redirect('back')

        } else {
          res.render('announcements/announcements', {announcements: foundAnns, announced: true, announcement: foundAnn})
        }
      })
    }
  })
})

router.get('/delete_announcement', middleware.isLoggedIn, (req, res) => {
  Announcement.findByIdAndDelete(req.query.id, (err, foundAnn) => {
    if (err || !foundAnn) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      req.flash('success', 'Announcement Deleted!')
      res.redirect('/announce')
    }
  })
})

router.get('/edit_announcement', middleware.isLoggedIn, (req, res) => {
  Announcement.findById(req.query.id, (err, foundAnn) => {
    if (err || !foundAnn) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
        if (err || !foundAnns) {
          req.flash('error', 'Unable to access database')
          res.redirect('back')

        } else {
          res.render('announcements/editAnnouncement', {announcements: foundAnns, announced: false, announcement: foundAnn})
        }
      })
    }
  })
})

router.post('/submit_announcement_changes', middleware.isLoggedIn, (req, res) => {
  Announcement.findByIdAndUpdate(req.query.id, {subject: req.body.subject, text: req.body.message}, (err, foundAnn) => {
    if (err || !foundAnn) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      req.flash('success', 'Announcement Updated!')
      res.redirect(`/view_announcement?id=${foundAnn._id}`)
    }
  })
})
module.exports = router;
