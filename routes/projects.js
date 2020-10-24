//Project routes dictate the posting, viewing, and editing of the Saberchat Student Projects Board

//LIBRARIES
const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat')

//SCHEMA
const User = require('../models/user');
const Project = require('../models/project');


//ROUTES
router.get('/', middleware.isLoggedIn, (req, res) => { //RESTful Routing 'INDEX' route

  Project.find({})
  .populate('creators')
  .populate('poster')
  .exec((err, foundProjects) => { //Find all projects, collect info on their creators and posters (part of the 'User' schema)
    if (err || !foundProjects) {
      console.log(err)
      req.flash('error', 'Unable to access database')
      res.redirect('back')

    } else {
      res.render('projects/index', {projects: foundProjects}) //Post the project data to HTML page, which formats the data
    }
  })
})

router.get('/new', middleware.isLoggedIn, middleware.isFaculty, (req, res) => { ////RESTful Routing 'NEW' route
  User.find({permission: 'student'}, (err, foundUsers) => { //Find all students, so that when teachers post a project, they can select which students created it
    if (err || !foundUsers) {
      console.log(err)
      req.flash('error', 'Unable to access database')
      res.redirect('back')

    } else {
      res.render('projects/new', {students: foundUsers})
    }
  })
})

router.post('/',middleware.isLoggedIn, middleware.isFaculty, (req, res) => { //RESTful Routing 'CREATE' route

  (async() => { //Asynchronous functions dictates that processes occur one at a time, reducing excessive callbacks

    const creators = await User.find({_id: {$in: req.body.creatorInput.split(',')}}); //Figure out all the students who created the project, based on the usernames the teacher entered

    if (!creators) {
      req.flash('error', "Unable to find the users you listed"); return res.redirect('back')
    }

    const project = await Project.create({title: req.body.title, imgUrl: req.body.img, text: req.body.text, poster: req.user, creators}); //Create a new project with all the provided data

    if (!project) {
      req.flash('error', "Unable to create project"); return res.redirect('back');
    }

    project.date = dateFormat(project.created_at, "h:MMTT | mmm d")
    await project.save()

    req.flash('success', "Project Posted!")
    res.redirect(`/projects/${project._id}`)

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  });
})

router.get('/:id/edit', middleware.isLoggedIn, middleware.isFaculty, (req, res) => { //RESTful Routing 'EDIT' route

  (async() => { //Asynchronous functions dictates that processes occur one at a time, reducing excessive callbacks

    const project = await Project.findById(req.params.id).populate('poster').populate('creators'); //Find one project based on id provided in form

    if (!project) {
      req.flash('error', 'Unable to find project')
      res.redirect('back')

    } else if (project.poster._id.toString() != req.user._id.toString()) { //If you didn't post the project, you can't edit it
      req.flash('error', "You may only delete projects that you have posted"); return res.redirect('back') //
    }

    let creatornames = [] //Will store a list of all the project's creators' usernames

    for (let creator of project.creators) { //Add each creator's username to creatornames
      creatornames.push(creator.username)
    }

    const students = await User.find({permission: 'student'}); //Find all students - all of whom are possible project creators

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

router.get('/:id', middleware.isLoggedIn, (req, res) => { //RESTful Routing 'SHOW' route

  Project.findById(req.params.id)
  .populate('poster')
  .populate('creators')
  .exec((err, foundProject) => { //Find the project specified in the form, get info about its poster and creators (part of the User schema)
    if (err || !foundProject) {
      req.flash('error', "Unable to access database")
      res.redirect('back')

    } else {
      res.render('projects/show', {project: foundProject})
    }
  })
})


router.put('/:id', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {

  (async() => { //Asynchronous functions dictates that processes occur one at a time, reducing excessive callbacks

    const creators = await User.find({_id: {$in: req.body.creatorInput.split(',')}});

    if (!creators) {
      req.flash('error', 'Unable to find project creators'); return res.redirect('back')
    }

    const project = await Project.findById(req.params.id).populate('poster');

    if (!project) {
      req.flash('error', "Unable to find project"); return res.redirect('back')
    }

    if (project.poster._id.toString() != req.user._id.toString()) {
      req.flash('error', "You may only update projects that you have posted");
      return res.redirect('back')
    }

    const updatedProject = await Project.findByIdAndUpdate(project._id, {title: req.body.title, imgUrl: req.body.img, creators, text: req.body.text});

    if (!updatedProject) {
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

router.delete('/:id', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {

  (async() => { //Asynchronous functions dictates that processes occur one at a time, reducing excessive callbacks
    const project = await Project.findById(req.params.id);

    if (!project) {
      req.flash('error', "Unable to access project"); return res.redirect('back')

    } else if (project.poster._id.toString() != req.user._id.toString()) { //If you didn't post the project, you can't delete it
      req.flash('error', "You may only delete projects that you have posted"); return res.redirect('back')
    }

    const deletedProject = await Project.findByIdAndDelete(project._id);

    if (!deletedProject) {
      req.flash('error', "Unable to delete project"); return res.redirect('back')
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
