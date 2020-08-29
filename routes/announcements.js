const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const User = require('../models/user');
const Announcement = require('../models/announcement');

//Route to render 'sendAnnouncement' page
router.get('/announce', middleware.isLoggedIn, (req, res) => {
  if (req.user.permission == 'teacher' || req.user.permission == 'admin') {
    res.render('announcements/sendAnnouncement')

  } else {
    req.flash('error', 'Your status does not permit you to send announcements.')
    res.redirect('/announcements')
  }
})

//Route to send announcements to bulletin
router.post('/sendAnnouncement', middleware.isLoggedIn, (req, res) => {
  Announcement.create({sender: req.user, text: req.body.message}, (err, announcement) => {
    announcement.save()
  })
  req.flash('success', 'Announcement posted to bulletin!')
  res.redirect('/announcements')
})


//Route to access bulletin
router.get('/announcements', middleware.isLoggedIn, (req, res) => {
  Announcement.find({

  }).populate({path: 'sender', select: ['username', 'imageUrl']})
  .populate('message') //Collect data for announcement's sender and message

  .exec((err, foundAnns) => {
    if (err || !foundAnns) {
      req.flash('error', 'Unable to access database')
      res.redirect('back')

    } else {
      res.render('announcements/announcements', {announcements: foundAnns})
    }
  })
})

module.exports = router;
