const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat')
const multer = require('multer')
const upload = multer({dest: __dirname + '/../public/uploads'});

const User = require('../models/user');
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
      res.render('projects/index', {projects: foundProjects})
    }
  })
})

router.get('/new', [middleware.isLoggedIn, middleware.isFaculty], (req, res) => {
  User.find({permission: 'student'}, (err, foundUsers) => {
    if (err || !foundUsers) {
      console.log(err)
      req.flash('error', 'Unable to access database')
      res.redirect('back')

    } else {
      res.render('projects/new', {students: foundUsers})
    }
  })
})

router.post('/',[middleware.isLoggedIn, middleware.isFaculty], upload.single('img'), (req, res) => {

  User.find({username: {$in: req.body.creators.split(', ')}}, (err, foundCreators) => {
    if (err || !foundCreators) {
      req.flash('error', 'Unable to access database')
      res.redirect('back')

    } else if(foundCreators.length != req.body.creators.split(', ').length) {
      req.flash('error', 'Some profiles were changed. Please create project again');
      res.redirect('back');

    } else {

      Project.create({title: req.body.title, imgUrl: req.body.img, text: req.body.text, poster: req.user, creators: foundCreators}, (err, project) => {
        if (err || !project) {
          console.log(err)
          req.flash('error', 'Unable to save project')
          res.redirect('back')

        } else {
          project.date = dateFormat(project.created_at, "mmm d, h:MMTT")
          project.save()

          // if(req.file) {
          //   project.imgUrl = `uploads/${req.file.filename}`
          //   project.save()
          //   req.flash('success', 'Project posted!')
      		// 	res.redirect(`/projects/${project._id}`)
          // }
          //
          // else {
          //   throw 'error';
          // }

        }
      })

    }
  })

})

router.get('/:id/edit', [middleware.isLoggedIn, middleware.isFaculty], (req, res) => {
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
          res.render('projects/edit', {project: foundProject, students: foundUsers, creatornames})
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
      res.render('projects/show', {project: foundProject})
    }
  })
})


router.put('/:id', [middleware.isLoggedIn, middleware.isFaculty], (req, res) => {
  User.find({username: {$in: req.body.creators.split(', ')}}, (err, foundCreators) => {
    if (err || !foundCreators) {
      req.flash('error', 'Unable to access database')
      res.redirect('back')

    } else if(foundCreators.length != req.body.creators.split(', ').length) {
      req.flash('error', 'Some profiles were changed. Please create project again');
      res.redirect('back');

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

router.delete('/:id', [middleware.isLoggedIn, middleware.isFaculty], (req, res) => {

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
