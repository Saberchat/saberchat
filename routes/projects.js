const express = require('express');
const middleware = require('../middleware');
const dateFormat = require('dateFormat')
const router = express.Router(); //start express router
const User = require('../models/user');
const Announcement = require('../models/announcement')
const Project = require('../models/project');

router.get('/projects', middleware.isLoggedIn, (req, res) => {
  Project.find({}, (err, foundProjects) => {
    if (err || !foundProjects) {
      console.log(err)
      req.flash('error', 'Unable to access database')
      res.redirect('back')

    } else {

      Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
        if (err || !foundAnns) {
          req.flash('error', 'Unable to access database')
          res.redirect('back')

        } else {
          let dates = []

    			for (let ann of foundAnns) {
    				dates.push(dateFormat(ann.created_at, "mmm d, h:MMTT"))
    			}

          res.render('projects/projects', {announcements: foundAnns.reverse(), dates: dates.reverse(), projects: foundProjects})
        }
      })
    }
  })
})

router.get('/view_project/:id', (req, res) => {
  Project.findById(req.params.id, (err, foundProject) => {
    if (err || !foundProject) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
        if (err || !foundAnns) {
          req.flash('error', 'Unable to access database')
          res.redirect('back')

        } else {
          let dates = []

    			for (let ann of foundAnns) {
    				dates.push(dateFormat(ann.created_at, "mmm d, h:MMTT"))
    			}

          res.render('projects/viewProject', {announcements: foundAnns.reverse(), dates: dates.reverse(), project: foundProject})
        }
      })
    }
  })
})

router.get('/addProject', middleware.isLoggedIn, (req, res) => {
  User.find({permission: 'student'}, (err, foundUsers) => {
    if (err || !foundUsers) {
      console.log(err)
      req.flash('error', 'Unable to access database')
      res.redirect('back')

    } else {
      Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
        if (err || !foundAnns) {
          req.flash('error', 'Unable to access database')
          res.redirect('back')

        } else {
          let dates = []

    			for (let ann of foundAnns) {
    				dates.push(dateFormat(ann.created_at, "mmm d, h:MMTT"))
    			}

          res.render('projects/addProject', {announcements: foundAnns.reverse(), dates: dates.reverse(), students: foundUsers})
        }
      })
    }
  })
})

router.post('/submitProject', (req, res) => {
  Project.create({title: req.body.title, imgUrl: req.body.img, text: req.body.text, poster: req.user.username, creators: req.body.creators.split(', ')}, (err, project) => {
    if (err || !project) {
      console.log(err)
      req.flash('error', 'Unable to save project')
      res.redirect('back')

    } else {
      project.save()
      req.flash('success', 'Project posted!')
			res.redirect('/projects')
    }
    })
})

router.get('/edit_project/:id', (req, res) => {
  Project.findById(req.params.id, (err, foundProject) => {
    if (err || !foundProject) {
      req.flash('error', 'Unable to Access Database')
      res.redirect('back')

    } else {
      User.find({permission: 'student'}, (err, foundUsers) => {
        if (err || !foundUsers) {
          console.log(err)
          req.flash('error', 'Unable to access database')
          res.redirect('back')

        } else {
          Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
            if (err || !foundAnns) {
              req.flash('error', 'Unable to access database')
              res.redirect('back')

            } else {
              let dates = []

        			for (let ann of foundAnns) {
        				dates.push(dateFormat(ann.created_at, "mmm d, h:MMTT"))
        			}

              res.render('projects/editProject', {announcements: foundAnns.reverse(), dates: dates.reverse(), project: foundProject, students: foundUsers})
            }
          })
        }
      })
    }
  })
})

router.post('/submit_project_edits/:id', (req, res) => {
  Project.findByIdAndUpdate(req.params.id, {title: req.body.title, imgUrl: req.body.img, creators: req.body.creators.split(', '), text: req.body.text}, (err, foundProject) => {
    if (err || !foundProject) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      req.flash("success", "Project Updated!")
      res.redirect('/projects')
    }
  })
})

router.get('/delete_project/:id', (req, res) => {
  Project.findByIdAndDelete(req.params.id, (err, foundProject) => {
    if (err || !foundProject) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      req.flash("success", "Project Deleted!")
      res.redirect('/projects')
    }
  })
})
module.exports = router;
