const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat')
const User = require('../models/user');
const Announcement = require('../models/announcement')
const Project = require('../models/project');

router.get('/', middleware.isLoggedIn, (req, res) => {

  Project.find({})
  .populate('creators')
  .populate('poster')
  .exec((err, foundProjects) => {
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

          res.render('projects/index', {announcements: foundAnns.reverse(), projects: foundProjects})
        }
      })
    }
  })
})

router.get('/new', middleware.isLoggedIn, (req, res) => {
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

          res.render('projects/new', {announcements: foundAnns.reverse(), students: foundUsers})
        }
      })
    }
  })
})

router.post('/create', middleware.isLoggedIn, (req, res) => {

  User.find({username: {$in: req.body.creators.split(', ')}}, (err, foundCreators) => {
    if (err || !foundCreators) {
      req.flash('error', 'Unable to access database')
      res.redirect('back')

    } else {

      Project.create({title: req.body.title, imgUrl: req.body.img, text: req.body.text, poster: req.user, creators: foundCreators}, (err, project) => {
        if (err || !project) {
          console.log(err)
          req.flash('error', 'Unable to save project')
          res.redirect('back')

        } else {
          project.date = dateFormat(project.created_at, "mmm d, h:MMTT")
          project.save()
          req.flash('success', 'Project posted!')
    			res.redirect(`/projects/${project._id}`)
        }
      })

    }
  })

})

router.get('/:id/edit', middleware.isLoggedIn, (req, res) => {
  Project.findById(req.params.id)
  .populate('poster')
  .populate('creators')
  .exec((err, foundProject) => {

    if (err || !foundProject) {
      req.flash('error', 'Unable to Access Database')
      res.redirect('back')

    } else {
      let creatornames = []
      for (let creator of foundProject.creators) {
        creatornames.push(creator.username)
      }

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

              res.render('projects/edit', {announcements: foundAnns.reverse(), project: foundProject, students: foundUsers, creatornames})
            }
          })
        }
      })
    }
  })
})

router.get('/:id', middleware.isLoggedIn, (req, res) => {
  Project.findById(req.params.id)
  .populate('poster')
  .populate('creators')
  .exec((err, foundProject) => {
    if (err || !foundProject) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
        if (err || !foundAnns) {
          req.flash('error', 'Unable to access database')
          res.redirect('back')

        } else {

          res.render('projects/show', {announcements: foundAnns.reverse(), project: foundProject})
        }
      })
    }
  })
})


router.put('/:id', middleware.isLoggedIn, (req, res) => {
  User.find({username: {$in: req.body.creators.split(', ')}}, (err, foundCreators) => {
    if (err || !foundCreators) {
      req.flash('error', 'Unable to access database')
      res.redirect('back')

    } else {

      Project.findByIdAndUpdate(req.params.id, {title: req.body.title, imgUrl: req.body.img, creators: foundCreators, text: req.body.text}, (err, foundProject) => {
        if (err || !foundProject) {
          req.flash('error', "Unable to access database")
          res.redirect('back')

        } else {
          req.flash("success", "Project Updated!")
          res.redirect(`/projects/${foundProject._id}`)
        }
      })
    }
  })
})

router.delete('/:id', (req, res) => {

  Project.findById(req.params.id, (err, foundProj) => {
    if (foundProj.poster._id.toString() != req.user._id.toString()) {
      req.flash('error', "You can only delete projects you posted")
      res.redirect('back')

    } else {
      Project.findByIdAndDelete(req.params.id, (err, foundProject) => {
        if (err || !foundProject) {
          req.flash('error', "Unable to access database")
          res.redirect('back')

        } else {
          req.flash("success", "Project Deleted!")
          res.redirect('/projects')
        }
      })
    }
  })

})

module.exports = router;
