//Announcement routes dictate the posting, viewing, and editing of the Saberchat Announcement Bulletin

//LIBRARIES
const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat');
const nodemailer = require('nodemailer');

//SCHEMA
const User = require('../models/user');
const Announcement = require('../models/announcement');

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'noreply.saberchat@gmail.com',
    pass: 'Tgy8erwIYtxRZrJHvKwkWbrkbUhv1Zr9'
  }
});

//ROUTES
router.get('/', (req, res) => { //RESTful Routing 'INDEX' route
  Announcement.find({}).populate('sender').exec((err, foundAnns) => { //Collects data about all announcements
    if (err || !foundAnns) {
      console.log(err);
      req.flash('error', "Unable To Access Database");
      res.redirect('back');

    } else {
      res.render('announcements/index', {announcements: foundAnns.reverse()}); //Render announcement page with data on all announcements
    }
  })
})


router.get('/new', middleware.isLoggedIn, middleware.isMod, (req, res) => { //RESTful Routing 'NEW' route
  res.render('announcements/new');
});

router.get('/mark-all', middleware.isLoggedIn, (req, res) => {
  req.user.annCount = [];
  req.user.save();
  req.flash('success', 'All Announcements Marked As Read!');
  res.redirect(`/announcements`);
});

router.get('/mark/:id', middleware.isLoggedIn, (req, res) => {
  let index = -1;

  for (let i = 0; i < req.user.annCount.length; i ++) {
    if (req.user.annCount[i].announcement.toString() == req.params.id.toString()) {
      index = i;
    }
  }

  console.log(index);
  if (index > -1) {
    req.user.annCount.splice(index, 1);
    req.user.save()
  }

  req.flash('success', 'Announcement Marked As Read!');
  res.redirect(`/announcements`);
})


router.get('/:id', (req, res) => { //RESTful Routing 'SHOW' route
  Announcement.findById(req.params.id) //Find only the announcement specified from form
  .populate('sender')
  .exec((err, foundAnn) => { //Get info about the announcement's sender, and then release it to user
    if (err || !foundAnn) {
      req.flash('error', 'Unable To Access Database');
      res.redirect('back');

    } else {

      if (req.user) {

        let index = -1;
        for (let i = 0; i < req.user.annCount.length; i += 1) {

          if (foundAnn._id.toString() == req.user.annCount[i].announcement._id.toString()) {
            index = i;
          }
        }

        if (index != -1) {
          req.user.annCount.splice(index, 1);
        }

        req.user.save();
      }

      res.render('announcements/show', {announcement: foundAnn});
    }
  });
});

router.get('/:id/edit', middleware.isLoggedIn, middleware.isMod, (req, res) => { //RESTful Routing 'EDIT' route
  Announcement.findById(req.params.id, (err, foundAnn) => { //Find only the announcement specified from form
    if (err || !foundAnn) {
      req.flash('error', "Unable To Access Database");
      res.redirect('back');
    } else if(!foundAnn.sender._id.equals(req.user._id)) { //If you did not send the announcement, you cannot edit it (the 'edit' button does not show up if you did not create the announcement, but this is a double-check)
      req.flash('error', 'You do not have permission to do that');
      res.redirect('back');
    } else {
      res.render('announcements/edit', {announcement: foundAnn}); //If no problems, allow the user to edit announcement
    }
  });
});

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

    announcement.date = dateFormat(announcement.created_at, "h:MM TT | mmm d");
    await announcement.save();

    const users = await User.find({_id: {$nin: [req.user._id]}});
    let announcementEmail;

    let imageString = "";

    for (let image of announcement.images) {
      imageString += `<img src="${image}">`;
    }

    if (!users) {
      req.flash('error', "Unable To Access Database");
      res.rediect('back');
    }

    let announcementObject = {
      announcement: announcement,
      version: "new"
    };

    for (let user of users) {

      announcementEmail = {
        from: 'noreply.saberchat@gmail.com',
        to: user.email,
        subject: `New Saberchat Announcement - ${announcement.subject}`,
        html: `<p>Hello ${user.firstName},</p><p>${req.user.username} has recently posted a new announcement - '${announcement.subject}'.</p><p>${announcement.text}</p><p>You can access the full announcement at https://alsion-saberchat.herokuapp.com</p> ${imageString}`
      };

      transporter.sendMail(announcementEmail, (err, info) => {
				if (err) {
					console.log(err);
				} else {
					console.log('Email sent: ' + info.response);
				}
			});

      user.annCount.push(announcementObject);
      await user.save();
    }

    req.flash('success', 'Announcement posted to bulletin!');
    res.redirect(`/announcements/${announcement._id}`);

  })().catch(err => {
    console.log(err);
    req.flash('error', "Unable To Access Database2");
    return res.redirect('back');
  });
});

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

      let announcementEmail;

      let imageString = "";

      for (let image of announcement.images) {
        imageString += `<img src="${image}">`;
      }

      if (!users) {
        req.flash('error', "Unable To Access Database");
        res.rediect('back');
      }

      let announcementObject = {
        announcement: updatedAnnouncement,
        version: "updated"
      };

      let overlap;

      for (let user of users) {

        announcementEmail = {
          from: 'noreply.saberchat@gmail.com',
          to: user.email,
          subject: `Updated Saberchat Announcement - ${announcement.subject}`,
          html: `<p>Hello ${user.firstName},</p><p>${req.user.username} has recently updated an announcement - '${announcement.subject}'.</p><p>${announcement.text}</p><p>You can access the full announcement at https://alsion-saberchat.herokuapp.com</p> ${imageString}`
        };

        transporter.sendMail(announcementEmail, (err, info) => {
  				if (error) {
  					console.log(err);
  				} else {
  					console.log('Email sent: ' + info.response);
  				}
  			});

        overlap = false;

        for (let a of user.annCount) {
          if (a.announcement.toString() == updatedAnnouncement._id.toString()) {
            overlap = true;
            break;
          }
        }

        if (!overlap) {
          user.annCount.push(announcementObject);
          await user.save();
        }
      }

      req.flash('success', 'Announcement Updated!');
      res.redirect(`/announcements/${updatedAnnouncement._id}`);

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable To Access Database")
    res.redirect('back')
  });
});

router.delete('/:id', middleware.isLoggedIn, middleware.isMod, (req, res) => { // RESTful Routing 'DESTROY' route
  (async() => {

    const announcement = await Announcement.findById(req.params.id).populate('sender');
    if (!announcement) {
      req.flash('error', "Unable to access announcement");
      return res.redirect('back');
    }

    if (announcement.sender._id.toString() != req.user._id.toString()) {
      req.flash('error', "You can only delete announcements that you have posted");
      return res.redirect('back');

    } else {
      const deletedAnn = await Announcement.findByIdAndDelete(announcement._id);

      if (!deletedAnn) {
        req.flash('error', "Unable to delete announcement");
        return res.redirect('back');
      }

      const users = await User.find({}, (err, users) => {
        if (!users) {
          req.flash('error', "Unable to find users");
          return res.redirect('back');
        }

        for (let user of users) {

          let index;

          for (let i = 0; i < user.annCount.length; i += 1) {
            if (user.annCount[i].announcement.toString() == deletedAnn._id.toString()) {
              index = i;
            }
          }

          if (index > -1) {
            user.annCount.splice(index, 1);
            user.save();
          }
        }
      })

      req.flash('success', 'Announcement Deleted!');
      res.redirect('/announcements/');

    }
  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable To Access Database")
    res.redirect('back')
  });
});

module.exports = router; //Export these routes to app.js
