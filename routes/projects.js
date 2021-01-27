//Project routes dictate the posting, viewing, and editing of the Saberchat Student Projects Board

//LIBRARIES
const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat');
const fillers = require('../fillerWords');
const {transport, transport_mandatory} = require("../transport");
const convertToLink = require("../convert-to-link");
const { validateProject } = require('../middleware/validation');

//SCHEMA
const User = require('../models/user');
const Project = require('../models/project');
const Notification = require('../models/message');
const PostComment = require('../models/postComment');

//ROUTES
router.get('/', (req, res) => { //RESTful Routing 'INDEX' route

  Project.find({})
  .populate('creators')
  .populate('poster')
  .exec((err, foundProjects) => { //Find all projects, collect info on their creators and posters (part of the 'User' schema)
    if (err || !foundProjects) {
      req.flash('error', 'Unable to access database');
      res.redirect('back');

    } else {
      res.render('projects/index', {projects: foundProjects}); //Post the project data to HTML page, which formats the data
    }
  });
});

router.get('/new', middleware.isLoggedIn, middleware.isFaculty, (req, res) => { ////RESTful Routing 'NEW' route
  User.find({authenticated: true, status: {$nin: ['alumnus', 'guest', 'parent', 'faculty']}}, (err, foundUsers) => { //Find all students, so that when teachers post a project, they can select which students created it
    if (err || !foundUsers) {
      req.flash('error', 'Unable to access database');
      res.redirect('back');

    } else {
      res.render('projects/new', {students: foundUsers});
    }
  });
});

router.post('/',middleware.isLoggedIn, middleware.isFaculty, validateProject, (req, res) => { //RESTful Routing 'CREATE' route
  (async() => { //Asynchronous functions dictates that processes occur one at a time, reducing excessive callbacks

    let creators = [];
    let statusGroup; //Group of creators by status
    let individual; //Individual Creator ID

    if (req.body.creatorInput == '') {
      creators = [];

    } else {
      let statuses = ['7th', '8th', '9th', '10th', '11th', '12th'];

      for (let creator of req.body.creatorInput.split(',')) {

        if (statuses.indexOf(creator) > -1) {
          statusGroup = await User.find({authenticated: true, status: creator});

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

    const followers = await User.find({authenticated: true, _id: {$in: req.user.followers}});

    if (!followers) {
      req.flash('error', "Unable to access your followers");
      return res.redirect('back');
    }

    let notif;
    let postEmail;
    let imageString = ``;

    for (let image of project.images) {
      imageString += `<img style="width: 50%; height: 50%;" src="${image}"/>`;
    }

    for (let follower of followers) {

      notif = await Notification.create({subject: "New Project Post", sender: req.user, noReply: true, recipients: [follower], read: [], toEveryone: false, images: project.images}); //Create a notification to alert the user

      if (!notif) {
        req.flash('error', 'Unable to send notification'); return res.redirect('back');
      }

      notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
      notif.text = `Hello ${follower.firstName},\n\n${req.user.firstName} ${req.user.lastName} recently posted a new project: "${project.title}". Check it out!`;

      await notif.save();

      transport(follower, `New Project Post - ${project.title}`, `<p>Hello ${follower.firstName},</p><p>${req.user.firstName} ${req.user.lastName} recently posted a new project: <strong>${project.title}</strong>. Check it out!</p>${imageString}`);
      follower.inbox.push(notif); //Add notif to user's inbox
      follower.msgCount += 1;
      await follower.save();

    }

    req.flash('success', "Project Posted!");
    res.redirect(`/projects/${project._id}`);

  })().catch(err => {
    req.flash('error', "Unable to access database");
    res.redirect('back');
  });
});

//COMMENTED OUT FOR NOW, UNTIL WE MAKE FURTHER DECISIONS AT MEETING

// router.get('/data', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {
//
//   (async() => {
//
//     let projectKeywords = new Map(); //Store keywords
//     let commentKeywords = new Map(); //Maps positive comments to their respective projects
//     let popularProjects = [];
//     const regEx = new RegExp('[^a-zA-Z0-9]');
//     let projects = await Project.find({poster: req.user._id})
//
//     if (!projects) {
//       req.flash('error', "Unable to find projects"); return res.redirect('back');
//     }
//
//     let avgLikes = 0;
//
//     for (let project of projects) {
//       avgLikes += project.likes.length;
//     }
//
//     avgLikes /= projects.length;
//
//     for (let project of projects) {
//       if (project.likes.length >= avgLikes) {
//         popularProjects.push(project);
//       }
//     }
//
//     //Sort popular projects
//
//     let tempProject;
//     for (let i = 0; i < popularProjects.length - 1; i ++) {
//       for (let j = 0; j < popularProjects.length - 1; j ++) {
//         if (popularProjects[j].likes < popularProjects[j+1].likes) {
//           tempProject = popularProjects[j];
//           popularProjects[j] = popularProjects[j+1];
//           popularProjects[j+1] = tempProject;
//         }
//       }
//     }
//
//     //Map keywords from popular projects
//
//     for (let project of popularProjects) {
//       for (let word of `${project.title} ${project.text}`.toLowerCase().split(regEx)) {
//
//         if (word.length > 3 && !fillers.includes(word)) {
//           if (projectKeywords.has(word)) {
//             projectKeywords.set(word, projectKeywords.get(word) + project.likes.length);
//
//           } else {
//             projectKeywords.set(word, project.likes.length); //Give 'points' based on how many likes the project has. That way, this keyword carries more value
//           }
//         }
//       }
//     }
//
//     let avgOccurences = 0; //Averages occurences of keywords
//
//     for (let [keyword, occurences] of projectKeywords.entries()) {
//       avgOccurences += occurences;
//     }
//
//     avgOccurences /= projectKeywords.size;
//
//     for (let [keyword, occurences] of projectKeywords.entries()) {
//       if (occurences < avgOccurences) {
//         projectKeywords.delete(keyword);
//       }
//     }
//
//     const sortStringValues = (a, b) => (a[1] < b[1] && 1) || (a[1] === b[1] ? 0 : -1) //Sort/switch map algorithm
//
//     projectKeywords = new Map([...projectKeywords].sort(sortStringValues)) //Map notation. Got it from MDN
//
//     res.render('projects/data', {popularProjects, projectKeywords})
//
//   })().catch(err => {
//     req.flash('error', "Unable to access database");
//     res.redirect('back');
//   });
// });

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

    const students = await User.find({authenticated: true, status: {$nin: ['alumnus', 'guest', 'parent', 'faculty']}}); //Find all students - all of whom are possible project creators

    if (!students) {
      req.flash('error', 'Unable to find student list'); return res.redirect('back');
    }

    res.render('projects/edit', {project, students, creatornames});

  })().catch(err => {
    req.flash('error', "Unable to access database");
    res.redirect('back');
  });
});

router.get('/:id', (req, res) => { //RESTful Routing 'SHOW' route

  Project.findById(req.params.id)
  .populate('poster')
  .populate('creators')
  .populate({
    path: "comments",
    populate: {
      path: "sender"
    }
  })
  .exec((err, foundProject) => { //Find the project specified in the form, get info about its poster and creators (part of the User schema)
    if (err || !foundProject) {
      req.flash('error', "Unable to access database");
      res.redirect('back');

    } else {
      const convertedText = convertToLink(foundProject.text);
      res.render('projects/show', {project: foundProject, convertedText});
    }
  });
});

router.put('/like', middleware.isLoggedIn, (req, res) => {
  Project.findById(req.body.project, (err, project) => {
    if (err || !project) {
      res.json({error: 'Error updating project'});

    } else {
      if (project.likes.includes(req.user._id)) { //Remove like
        project.likes.splice(project.likes.indexOf(req.user._id), 1);
        project.save();

        res.json({
          success: `Removed a like from ${project.title}`,
          likeCount: project.likes.length
        });

      } else { //Add like
        project.likes.push(req.user._id);
        project.save();

        res.json({
          success: `Liked ${project.title}`,
          likeCount: project.likes.length
        });
      }
    }
  });
});

router.put('/like-comment', middleware.isLoggedIn, (req, res) => {
  PostComment.findById(req.body.commentId, (err, comment) => {
    if (err || !comment) {
      res.json({error: 'Error updating comment'});

    } else {

      if (comment.likes.includes(req.user._id)) { //Remove Like
        comment.likes.splice(comment.likes.indexOf(req.user._id), 1);
        comment.save();
        res.json({
          success: `Removed a like from a comment`,
          likeCount: comment.likes.length
        });

      } else { //Add Like
        comment.likes.push(req.user._id);
        comment.save();

        res.json({
          success: `Liked comment`,
          likeCount: comment.likes.length
        });
      }
    }
  });
});

router.put('/comment', middleware.isLoggedIn, (req, res) => {

  (async() => {

    const project = await Project.findById(req.body.project)
    .populate({
      path: "comments",
      populate: {
        path: "sender"
      }
    });

    if (!project) {
      return res.json({error: 'Error commenting'});
    }

    const comment = await PostComment.create({text: req.body.text, sender: req.user, date: dateFormat(new Date(), "h:MM TT | mmm d")});
    if (!comment) {
      return res.json({error: 'Error commenting'});
    }

    comment.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
    await comment.save();

    project.comments.push(comment);
    await project.save();

    let users = [];
    let user;

    for (let line of comment.text.split(" ")) {
      if (line[0] == '@') {
        user = await User.findById(line.split("#")[1].split("_")[0]);

        if (!user) {
          return res.json({error: "Error accessing user"});
        }

        users.push(user);
      }
    }

    let notif;
    let commentEmail;

    for (let user of users) {

      notif = await Notification.create({subject: `New Mention in ${project.title}`, sender: req.user, noReply: true, recipients: [user], read: [], toEveryone: false, images: []}); //Create a notification to alert the user

      if (!notif) {
        return res.json({error: "Error creating notification"});
      }

      notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
      notif.text = `Hello ${user.firstName},\n\n${req.user.firstName} ${req.user.lastName} mentioned you in a comment on "${project.title}":\n${comment.text}`;

      await notif.save();

      transport(user, `New Mention in ${project.title}`, `<p>Hello ${user.firstName},</p><p>${req.user.firstName} ${req.user.lastName} mentioned you in a comment on <strong>${project.title}</strong>.<p>${comment.text}</p>`);

      user.inbox.push(notif); //Add notif to user's inbox
      user.msgCount += 1;
      await user.save();
    }

    res.json({
      success: 'Successful comment',
      comments: project.comments
    });

  })().catch(err => {
    res.json({error: "Error Commenting"});
  });
});

router.put('/:id', middleware.isLoggedIn, middleware.isFaculty, validateProject, (req, res) => {
  (async() => { //Asynchronous functions dictates that processes occur one at a time, reducing excessive callbacks

    let creators = [];
    let statusGroup; //Group of creators by status
    let individual; //Individual Creator ID

    if (req.body.creatorInput == '') {
      creators = [];

    } else {
      let statuses = ['7th', '8th', '9th', '11th', '12th'];

      let creatorInputArray = req.body.creatorInput.split(',');

      for (let creator of creatorInputArray) {

        if (statuses.indexOf(creator) > -1) {
          statusGroup = await User.find({authenticated: true, status: creator});

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

    const followers = await User.find({authenticated: true, _id: {$in: req.user.followers}});

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

      notif = await Notification.create({subject: "New Project Post", sender: req.user, noReply: true, recipients: [follower], read: [], toEveryone: false, images: updatedProject.images}); //Create a notification to alert the user

      if (!notif) {
        req.flash('error', 'Unable to send notification'); return res.redirect('back');
      }

      notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
      notif.text = `Hello ${follower.firstName},\n\n${req.user.firstName} ${req.user.lastName} recently updated one of their projects: "${updatedProject.title}". Check it out!`;

      await notif.save();

      transport(follower, `New Project Post - ${updatedProject.title}`, `<p>Hello ${follower.firstName},</p><p>${req.user.firstName} ${req.user.lastName} recently updated one of their projects: <strong>${updatedProject.title}</strong>. Check it out!</p>${imageString}`);

      follower.inbox.push(notif); //Add notif to user's inbox
      follower.msgCount += 1;
      await follower.save();
    }

    req.flash("success", "Project Updated!");
    res.redirect(`/projects/${project._id}`);

  })().catch(err => {
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
    req.flash('error', "Unable to access database");
    res.redirect('back');
  });
});

module.exports = router;
