const express = require('express');
const middleware = require('../middleware');
const dateFormat = require('dateFormat')
const router = express.Router(); //start express router
const User = require('../models/user');
const Announcement = require('../models/announcement')
const Project = require('../models/project');

router.get('/projects', middleware.isLoggedIn, (req, res) => {

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

          res.render('projects/projects', {announcements: foundAnns.reverse(), projects: foundProjects})
        }
      })
    }
  })
})

router.get('/view_project/:id', middleware.isLoggedIn, (req, res) => {
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

          res.render('projects/viewProject', {announcements: foundAnns.reverse(), project: foundProject})
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

          res.render('projects/addProject', {announcements: foundAnns.reverse(), students: foundUsers})
        }
      })
    }
  })
})

router.post('/submitProject', middleware.isLoggedIn, (req, res) => {

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
          project.save()
          req.flash('success', 'Project posted!')
    			res.redirect('/projects')
        }
      })

    }
  })

})

router.get('/edit_project/:id', middleware.isLoggedIn, (req, res) => {
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

              res.render('projects/editProject', {announcements: foundAnns.reverse(), project: foundProject, students: foundUsers, creatornames})
            }
          })
        }
      })
    }
  })
})

router.post('/submit_project_edits/:id', middleware.isLoggedIn, (req, res) => {
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
          res.redirect('/projects')
        }
      })
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
