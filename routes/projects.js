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

  (async() => {
    const creators = await User.find({username: {$in: req.body.creators.split(', ')}});

    if (!creators) {
      req.flash('error', "Unable to find the users you listed"); return res.redirect('back')

    } else if(creators.length != req.body.creators.split(', ').length) {
      req.flash('error', 'Some profiles were changed. Please create project again'); return res.redirect('back');
    }

    const project = await Project.create({title: req.body.title, imgUrl: req.body.img, text: req.body.text, poster: req.user, creators});

    if (!project) {
      req.flash('error', "Unable to create project"); return res.redirect('back');
    }

    project.date = dateFormat(project.created_at, "mmm d, h:MMTT")
    await project.save()

    req.flash('success', "Project Posted!")
    res.redirect(`/projects/${project._id}`)

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unaable to access database")
    res.redirect('back')
  });
})

router.get('/:id/edit', [middleware.isLoggedIn, middleware.isFaculty], (req, res) => {

  (async() => {

    const project = await Project.findById(req.params.id).populate('poster').populate('creators');

    if (!project) {
      req.flash('error', 'Unable to find project')
      res.redirect('back')
    }

    let creatornames = []

    for (let creator of project.creators) {
      creatornames.push(creator.username)
    }

    const students = await User.find({permission: 'student'});

    if (!students) {
      req.flash('error', 'Unable to find student list'); return res.redirect('back')
    }

    res.render('projects/edit', {project, students, creatornames})

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
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

  (async() => {
    const creators = await User.find({username: {$in: req.body.creators.split(', ')}});

    if (!creators) {
      req.flash('error', 'Unable to find project creators'); return res.redirect('back')

    } else if (creators.length != req.body.creators.split(', ').length) {
      req.flash('error', 'Some profiles were changed. Please create project again'); return res.redirect('back');
    }

    const project = await Project.findByIdAndUpdate(req.params.id, {title: req.body.title, imgUrl: req.body.img, creators, text: req.body.text});

    if (!project) {
      req.flash('error', "Unable to update project"); return res.redirect('back')
    }

    req.flash("success", "Project Updated!")
    res.redirect(`/projects/${project._id}`)

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  })
})

router.delete('/:id', [middleware.isLoggedIn, middleware.isFaculty], (req, res) => {

  (async() => {
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      req.flash('error', "Unable to delete project"); return res.redirect('back')

    } else if (project.poster._id.toString() != req.user._id.toString()) {
      req.flash('error', "You may only delete projects that you have posted"); return res.redirect('back')
    }

    req.flash("success", "Project Deleted!")
    res.redirect('/projects')

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  })
})

module.exports = router;
