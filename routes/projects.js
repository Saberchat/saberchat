//Project routes dictate the posting, viewing, and editing of the Saberchat Student Projects Board

//LIBRARIES
const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat')
const nodemailer = require('nodemailer');

//SCHEMA
const User = require('../models/user');
const Project = require('../models/project');
const Notification = require('../models/message');

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'noreply.saberchat@gmail.com',
    pass: 'Tgy8erwIYtxRZrJHvKwkWbrkbUhv1Zr9'
  }
});

//ROUTES
router.get('/', (req, res) => { //RESTful Routing 'INDEX' route

  Project.find({})
  .populate('creators')
  .populate('poster')
  .exec((err, foundProjects) => { //Find all projects, collect info on their creators and posters (part of the 'User' schema)
    if (err || !foundProjects) {
      console.log(err);
      req.flash('error', 'Unable to access database');
      res.redirect('back');

    } else {
      res.render('projects/index', {projects: foundProjects}); //Post the project data to HTML page, which formats the data
    }
  })
})

router.get('/new', middleware.isLoggedIn, middleware.isFaculty, (req, res) => { ////RESTful Routing 'NEW' route
  User.find({status: {$nin: ['alumnus', 'guest', 'parent', 'faculty']}}, (err, foundUsers) => { //Find all students, so that when teachers post a project, they can select which students created it
    if (err || !foundUsers) {
      console.log(err);
      req.flash('error', 'Unable to access database');
      res.redirect('back');

    } else {
      res.render('projects/new', {students: foundUsers});
    }
  })
})

router.post('/',middleware.isLoggedIn, middleware.isFaculty, (req, res) => { //RESTful Routing 'CREATE' route

  (async() => { //Asynchronous functions dictates that processes occur one at a time, reducing excessive callbacks

    let creators = [];
    let statusGroup; //Group of creators by status
    let individual; //Individual Creator ID

    if (req.body.creatorInput == '') {
      creators = [];

    } else {
      let statuses = ['7th', '8th', '9th', '11th', '12th'];

      for (let creator of req.body.creatorInput.split(',')) {

        if (statuses.indexOf(creator) > -1) {
          statusGroup = await User.find({status: creator});

          if (!statusGroup) {
            req.flash('error', "Unable to find the users you listed"); return res.redirect('back');
          }

          for (let user of statusGroup) {
            creators.push(user);
          }

        } else {
          individual = await User.findById(creator);
          if (!individual) {
            req.flash('error', "Unable to find the users you listed"); return res.redirect('back');
          }

          creators.push(individual);
        }
      }
    }

    const project = await Project.create({title: req.body.title, text: req.body.text, poster: req.user, creators}); //Create a new project with all the provided data

    if (!project) {
      req.flash('error', "Unable to create project"); return res.redirect('back');
    }

    if (req.body.images) { //If any images were added (if not, the 'images' property is null)
      for(const image in req.body.images) {
        project.images.push(req.body.images[image]);
      }
    }

    project.date = dateFormat(project.created_at, "h:MM TT | mmm d");
    await project.save();

    const followers = await User.find({_id: {$in: req.user.followers}});

    if (!followers) {
      req.flash('error', "Umable to access your followers");
      return res.redirect('back');
    }

    let notif;
    let postEmail;
    let imageString = ``;

    for (let image of project.images) {
      imageString += `<img style="width: 50%; height: 50%;" src="${image}"/>`;
    }

    for (let follower of followers) {

      notif = await Notification.create({subject: "New Project Post", sender: req.user, recipients: [follower], read: [], toEveryone: false, images: project.images}); //Create a notification to alert the user

      if (!notif) {
        req.flash('error', 'Unable to send notification'); return res.redirect('/cafe/orders');
      }

      notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
      notif.text = `Hello ${follower.firstName},\n\n${req.user.firstName} ${req.user.lastName} recently posted a new project: "${project.title}". Check it out!`;

      await notif.save();

      postEmail = {
        from: 'noreply.saberchat@gmail.com',
        to: follower.email,
        subject: `New Project Post - ${project.title}`,
        html: `<p>Hello ${follower.firstName},</p><p>${req.user.firstName} ${req.user.lastName} recently posted a new project: <strong>${project.title}</strong>. Check it out!</p>${imageString}`
      };

      transporter.sendMail(postEmail, (err, info) => {
        if (err) {
          console.log(err);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });

      follower.inbox.push(notif); //Add notif to user's inbox
      follower.msgCount += 1;
      await follower.save();

    }

    req.flash('success', "Project Posted!");
    res.redirect(`/projects/${project._id}`);

  })().catch(err => {
    console.log(err);
    req.flash('error', "Unable to access database");
    res.redirect('back');
  });
})

router.get('/:id/edit', middleware.isLoggedIn, middleware.isFaculty, (req, res) => { //RESTful Routing 'EDIT' route

  (async() => { //Asynchronous functions dictates that processes occur one at a time, reducing excessive callbacks

    const project = await Project.findById(req.params.id).populate('poster').populate('creators'); //Find one project based on id provided in form

    if (!project) {
      req.flash('error', 'Unable to find project');
      res.redirect('back');

    } else if (project.poster._id.toString() != req.user._id.toString()) { //If you didn't post the project, you can't edit it
      req.flash('error', "You may only delete projects that you have posted"); return res.redirect('back');
    }

    let creatornames = []; //Will store a list of all the project's creators' usernames

    for (let creator of project.creators) { //Add each creator's username to creatornames
      creatornames.push(creator.username);
    }

    const students = await User.find({status: {$nin: ['alumnus', 'guest', 'parent', 'faculty']}}); //Find all students - all of whom are possible project creators

    if (!students) {
      req.flash('error', 'Unable to find student list'); return res.redirect('back');
    }

    res.render('projects/edit', {project, students, creatornames});

  })().catch(err => {
    console.log(err);
    req.flash('error', "Unable to access database");
    res.redirect('back');
  })
})

router.get('/:id', (req, res) => { //RESTful Routing 'SHOW' route

  Project.findById(req.params.id)
  .populate('poster')
  .populate('creators')
  .exec((err, foundProject) => { //Find the project specified in the form, get info about its poster and creators (part of the User schema)
    if (err || !foundProject) {
      req.flash('error', "Unable to access database");
      res.redirect('back');

    } else {
      res.render('projects/show', {project: foundProject});
    }
  })
})


router.put('/:id', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {

  (async() => { //Asynchronous functions dictates that processes occur one at a time, reducing excessive callbacks

    let creators = [];
    let statusGroup; //Group of creators by status
    let individual; //Individual Creator ID

    if (req.body.creatorInput == '') {
      creators = [];

    } else {
      let statuses = ['7th', '8th', '9th', '11th', '12th'];

      let creatorInputArray = req.body.creatorInput.split(',');

      console.log(creatorInputArray);

      for (let creator of creatorInputArray) {

        if (statuses.indexOf(creator) > -1) {
          statusGroup = await User.find({status: creator});

          if (!statusGroup) {
            req.flash('error', "Unable to find the users you listed"); return res.redirect('back');
          }

          for (let user of statusGroup) {
            creators.push(user);
          }

        } else {
          individual = await User.findById(creator);
          if (!individual) {
            req.flash('error', "Unable to find the users you listed"); return res.redirect('back');
          }

          creators.push(individual);
        }
      }
    }

    const project = await Project.findById(req.params.id).populate('poster');

    if (!project) {
      req.flash('error', "Unable to find project"); return res.redirect('back');
    }

    if (project.poster._id.toString() != req.user._id.toString()) {
      req.flash('error', "You may only update projects that you have posted");
      return res.redirect('back');
    }

    const updatedProject = await Project.findByIdAndUpdate(project._id, {title: req.body.title, creators, text: req.body.text});

    if (!updatedProject) {
      req.flash('error', "Unable to update project"); return res.redirect('back');
    }

    updatedProject.images = []; //Empty image array so that you can fill it with whatever images are added (all images are there, not just new ones)
    if(req.body.images) { //Only add images if any are provided
      for(const image in req.body.images) {
        updatedProject.images.push(req.body.images[image]);
      }
    }

    updatedProject.save();

    const followers = await User.find({_id: {$in: req.user.followers}});

    if (!followers) {
      req.flash('error', "Umable to access your followers");
      return res.redirect('back');
    }

    let notif;
    let postEmail;

    let imageString = ``;

    for (let image of updatedProject.images) {
      imageString += `<img style="width: 50%; height: 50%;" src="${image}"/>`;
    }

    for (let follower of followers) {

      notif = await Notification.create({subject: "New Project Post", sender: req.user, recipients: [follower], read: [], toEveryone: false, images: updatedProject.images}); //Create a notification to alert the user

      if (!notif) {
        req.flash('error', 'Unable to send notification'); return res.redirect('/cafe/orders');
      }

      notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
      notif.text = `Hello ${follower.firstName},\n\n${req.user.firstName} ${req.user.lastName} recently updated one of their projects: "${updatedProject.title}". Check it out!`;

      await notif.save();

      postEmail = {
        from: 'noreply.saberchat@gmail.com',
        to: follower.email,
        subject: `New Project Post - ${updatedProject.title}`,
        html: `<p>Hello ${follower.firstName},</p><p>${req.user.firstName} ${req.user.lastName} recently updated one of their projects: <strong>${updatedProject.title}</strong>. Check it out!</p>${imageString}`
      };

      transporter.sendMail(postEmail, (err, info) => {
        if (err) {
          console.log(err);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });

      follower.inbox.push(notif); //Add notif to user's inbox
      follower.msgCount += 1;
      await follower.save();

    }

    req.flash("success", "Project Updated!");
    res.redirect(`/projects/${project._id}`);

  })().catch(err => {
    console.log(err);
    req.flash('error', "Unable to access database");
    res.redirect('back');
  });
});

router.delete('/:id', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {

  (async() => { //Asynchronous functions dictates that processes occur one at a time, reducing excessive callbacks
    const project = await Project.findById(req.params.id);

    if (!project) {
      req.flash('error', "Unable to access project"); return res.redirect('back');

    } else if (project.poster._id.toString() != req.user._id.toString()) { //If you didn't post the project, you can't delete it
      req.flash('error', "You may only delete projects that you have posted"); return res.redirect('back');
    }

    const deletedProject = await Project.findByIdAndDelete(project._id);

    if (!deletedProject) {
      req.flash('error', "Unable to delete project"); return res.redirect('back');
    }

    req.flash("success", "Project Deleted!");
    res.redirect('/projects');

  })().catch(err => {
    console.log(err)
    req.flash('error', "Unable to access database")
    res.redirect('back')
  });
});

module.exports = router;
