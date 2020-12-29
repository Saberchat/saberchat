//Project routes dictate the posting, viewing, and editing of the Saberchat Student Projects Board

//LIBRARIES
const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat');
const nodemailer = require('nodemailer');

//SCHEMA
const User = require('../models/user');
const Notification = require('../models/message');
const Course = require('../models/course');

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'noreply.saberchat@gmail.com',
    pass: 'Tgy8erwIYtxRZrJHvKwkWbrkbUhv1Zr9'
  }
});

router.get('/', middleware.isLoggedIn, (req, res) => {
  Course.find({}, (err, courses) => {
    if (err || !courses) {
      req.flash('error', "Unable to find courses");
      res.redirect('back');

    } else {
      let courseList = [];
      let userIncluded;
      for (let course of courses) {
        if ((course.teacher.equals(req.user._id)) || (course.students.includes(req.user._id))) {
          courseList.push(course);

        } else {
          for (let tutor of course.tutors) {
            if (tutor.tutor.equals(req.user._id)) {
              courseList.push(course);
            }
          }
        }
      }
      res.render('homework/index', {courses: courseList});
    }
  })
});

router.post('/', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {
  if (req.body.title.replace(' ', '') != '') {

    let charSetMatrix = [];
    charSetMatrix.push('qwertyuiopasdfghjklzxcvbnm'.split(''));
    charSetMatrix.push('QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
    charSetMatrix.push('1234567890'.split(''));

    let code_length = Math.round((Math.random() * 15)) + 10;
    let joinCode = "";

    let charSet; //Which character set to choose from
    for (let i = 0; i < code_length; i += 1) {
      charSet = charSetMatrix[Math.floor(Math.random() * 3)];
      joinCode += charSet[Math.floor((Math.random() * charSet.length))];
    }

    Course.create({name: req.body.title, joinCode, description: req.body.description, active: true, teacher: req.user}, (err, course) => {
      if (err || !course) {
        req.flash('error', "Unable to create course");
        res.redirect('back');

      } else {

        if (req.body.thumbnail.replace(' ', '') != "") {
          course.thumbnail = req.body.thumbnail;
          course.save();
        }

        req.flash('success', "Successfully created course");
        res.redirect('/homework');
      }
    });
  }
});

router.post('/join', middleware.isLoggedIn, middleware.isStudent, (req, res) => {
  Course.findOne({joinCode: req.body.joincode}, (err, course) => {
    if (err || !course) {
      req.flash('error', "No courses matching this join code were found.");
      res.redirect('back');

    } else if (course.students.includes(req.user._id)) {
      req.flash('error', `You are already enrolled in ${course.name} as a student.`);
      res.redirect('back');

    } else if (course.tutors.includes(req.user._id)) {
      req.flash('error', `You have already joined ${course.name} as a tutor.`);
      res.redirect('back');

    } else {
      course.students.push(req.user);
      course.save();
      req.flash('success', `Successfully joined ${course.name}!`);
      res.redirect(`/homework/${course._id}`);

    }
  });
});

// Studied APES under Ms. Jen from 2018-19. Scored a 5 on the AP Exam and finished with an A. I have past tutoring experience in Biology and AP Environmental Science, and am currently studying Environmental Science at Ohlone College. Z8AMlDxRV5Ek8x147o6lsbxvtWa
router.post('/join-tutor', middleware.isLoggedIn, middleware.isTutor, (req, res) => {
  Course.findOne({joinCode: req.body.joincode}, (err, course) => {
    if (err || !course) {
      req.flash('error', "No courses matching this join code were found.");
      res.redirect('back');

    } else if (course.students.includes(req.user._id)) {
      req.flash('error', `You are already enrolled in ${course.name} as a student.`);
      res.redirect('back');

    } else {
      let enrolled = false;
      for (let tutor of course.tutors) {
        if (tutor.tutor.equals(req.user._id)) {
          enrolled = true;
          req.flash('error', `You have already joined ${course.name} as a tutor.`);
          res.redirect('back');
        }
      }

      if (!enrolled) {
        course.tutors.push({tutor: req.user, bio: req.body.bio});
        course.save();
        req.flash('success', `Successfully joined ${course.name} as a tutor!`);
        res.redirect(`/homework/${course._id}`);
      }
    }
  });
});

router.get('/:id', middleware.isLoggedIn, (req, res) => {
  Course.findById(req.params.id).populate('teacher').populate('students').populate('tutors.tutor').exec((err, course) => {
    if (err || !course) {
      req.flash('error', "Unable to find course");
      res.redirect('back');

    } else {
      let studentTutorIds = [];
      for (let student of course.students) {
        studentTutorIds.push(student._id.toString());
      }

      for (let tutor of course.tutors) {
        studentTutorIds.push(tutor.tutor._id.toString());
      }

      if (course.teacher.equals(req.user._id) || studentTutorIds.includes(req.user._id.toString())) {
        res.render('homework/show', {course, studentTutorIds});

      } else {
        req.flash('error', "You do not have permission to view that course");
        res.redirect('back');
      }
    }
  });
});

router.put('/:id', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {
  Course.findByIdAndUpdate(req.params.id, {name: req.body.newName, description: req.body.description, thumbnail: req.body.thumbnailUrl}, (err, course) => {
    if (err || !course) {
      res.json({error: "An Error Occurred"});

    } else {
      res.json({success: "Succesfully Updated Course Information"});
    }
  });
});

router.put('/joinCode/:id', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {

  let charSetMatrix = [];
  charSetMatrix.push('qwertyuiopasdfghjklzxcvbnm'.split(''));
  charSetMatrix.push('QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
  charSetMatrix.push('1234567890'.split(''));

  let code_length = Math.round((Math.random() * 15)) + 10;
  let joinCode = "";

  let charSet; //Which character set to choose from
  for (let i = 0; i < code_length; i += 1) {
    charSet = charSetMatrix[Math.floor(Math.random() * 3)];
    joinCode += charSet[Math.floor((Math.random() * charSet.length))];
  }

  Course.findByIdAndUpdate(req.params.id, {joinCode}, (err, course) => {
    if (err || !course) {
      res.json({error: "An Error Occurred"});

    } else {
      res.json({success: "Succesfully Updated Join Code", joinCode});
    }
  });
});

router.post('/unenroll/:id', middleware.isLoggedIn, (req, res) => {
  Course.findByIdAndUpdate(req.params.id, {$pull: {students: req.user._id, tutors: req.user._id}}, (err, course) => {
    if (err || !course) {
      req.flash('error', "Unable to find course");
      res.redirect('back');

    } else {
      req.flash('success', `Unenrolled from ${course.name}!`);
      res.redirect('/homework');
    }
  });
});

module.exports = router;
