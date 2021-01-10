//Homework routes dictate interactions between teachers, tutors and students

//LIBRARIES
const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat');
const nodemailer = require('nodemailer');
const {transport, transport_mandatory} = require("../transport");

//SCHEMA
const User = require('../models/user');
const Notification = require('../models/message');
const Course = require('../models/course');
const PostComment = require('../models/postComment');
const Room = require('../models/room');

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
        course.tutors.push({tutor: req.user, bio: req.body.bio, slots: parseInt(req.body.slots), available: (parseInt(req.body.slots) > 0), dateJoined: new Date(Date.now())});
        course.save();
        req.flash('success', `Successfully joined ${course.name} as a tutor!`);
        res.redirect(`/homework/${course._id}`);
      }
    }
  });
});

router.get('/:id', middleware.isLoggedIn, (req, res) => {
  Course.findById(req.params.id).populate('teacher').populate('students').populate('tutors.tutor').populate('tutors.reviews.review').exec((err, course) => {
    if (err || !course) {
      req.flash('error', "Unable to find course");
      res.redirect('back');

    } else {
      let studentIds = [];
      let tutorIds = [];
      for (let student of course.students) {
        studentIds.push(student._id.toString());
      }

      for (let tutor of course.tutors) {
        tutorIds.push(tutor.tutor._id.toString());
      }

      if (course.teacher.equals(req.user._id) || studentIds.includes(req.user._id.toString()) || tutorIds.includes(req.user._id.toString())) {
        res.render('homework/show', {course, studentIds, tutorIds});

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
  Course.findByIdAndUpdate(req.params.id, {$pull: {students: req.user._id}}, (err, course) => {
    if (err || !course) {
      req.flash('error', "Unable to find course");
      res.redirect('back');

    } else {
      for (let i = course.tutors.length-1; i >= 0; i --) {
        if (course.tutors[i].tutor.equals(req.user._id)) {
          course.tutors.splice(i, 1);

        } else if (course.tutors[i].students.includes(req.user._id)) {
          course.tutors[i].students.splice(course.tutors[i].students.indexOf(req.user._id), 1);
          course.tutors[i].slots += 1;
          course.tutors[i].available = true;
        }
      }

      course.save();
      req.flash('success', `Unenrolled from ${course.name}!`);
      res.redirect('/homework');
    }
  });
});

router.put('/book/:id', middleware.isLoggedIn, middleware.isStudent, (req, res) => {
  (async() => {

    const course = await Course.findById(req.params.id).populate('tutors.tutor');

    if (!course) {
      return res.json({error: "Error accessing course"});

    } else if (!course.students.includes(req.user._id)) {
      res.json({error: "You are not a student of that tutor"});

    } else {
      for (let tutor of course.tutors) {
        if (tutor.tutor._id.equals(req.body.tutor) && tutor.available) {
          tutor.students.push(req.user._id);
          tutor.slots -= 1;
          if (tutor.slots == 0) {
            tutor.available = false;
          }

          const room = await Room.create({
            name: `${req.user.firstName}'s Tutoring Sessions With ${tutor.tutor.firstName} - ${course.name}`,
            creator: {id: tutor._id, username: tutor.username},
            members: [req.user._id],
            type: "private",
          });

          const roomObject = {
            student: req.user._id,
            room: room._id
          };

          tutor.rooms.push(roomObject);
          course.save();
          res.json({success: "Succesfully joined tutor"});
        }
      }
    }

  })().catch(err => {
    res.json({error: "Error accessing course"});
  });
});

router.put('/upvote/:id', middleware.isLoggedIn, middleware.isStudent, (req, res) => {
  Course.findById(req.params.id, (err, course) => {
    if (err || !course) {
      res.json({error: "Error upvoting tutor"});

    } else {
      for (let tutor of course.tutors) {

        if (tutor.tutor.equals(req.body.tutor)) {

          if (tutor.students.includes(req.user._id) || tutor.formerStudents.includes(req.user._id)) {
            if (tutor.upvotes.includes(req.user._id)) {
              tutor.upvotes.splice(tutor.upvotes.indexOf(req.user._id), 1);
              course.save();
              res.json({success: "Downvoted tutor", upvoteCount: tutor.upvotes.length});

            } else {
              tutor.upvotes.push(req.user._id);
              course.save();
              res.json({success: "Upvoted tutor", upvoteCount: tutor.upvotes.length});
            }

          } else {
            res.json({error: "You are not a student of this tutor"});
          }

        }
      }
    }
  });
});

router.put('/rate/:id', middleware.isLoggedIn, middleware.isStudent, (req, res) => {
  (async() => {

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.json({error: "Error reviewing tutor"});
    }

    for (let tutor of course.tutors) {
      if (tutor.tutor.equals(req.body.tutor)) {
        if (tutor.students.includes(req.user._id) || tutor.formerStudents.includes(req.user._id)) {

          let review = await PostComment.create({text: req.body.review, sender: req.user});
          if (!review) {
            return res.json({error: "Error reviewing tutor"});
          }

          review.date = dateFormat(review.created_at, "h:MM TT | mmm d");
          review.save();

          const reviewObject = {review, rating: req.body.rating};
          tutor.reviews.push(reviewObject);
          course.save();

          let averageRating = 0;
          for (let review of tutor.reviews) {
            averageRating += review.rating;
          }
          averageRating = Math.round(averageRating/tutor.reviews.length);

          res.json({success: "Succesfully upvoted tutor", averageRating, reviews_length: tutor.reviews.length, review: reviewObject, user: req.user});

        } else {
          res.json({error: "You are not a student of this tutor"});
        }
      }
    }

  })().catch(err => {
    console.log(err);
    res.json({error: err});
  });
});

//Leave Tutor
router.put('/leave/:id', middleware.isLoggedIn, middleware.isStudent, (req, res) => {
  (async() => {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.json({error: "Error leaving course"});

    } else {
      for (let tutor of course.tutors) {
        if (tutor.tutor.equals(req.body.tutor)) {
          if (tutor.students.includes(req.user._id)) {
            tutor.students.splice(tutor.students.indexOf(req.user._id), 1);
            tutor.formerStudents.push(req.user._id);
            tutor.slots += 1;
            tutor.available = true;

            for (let i = 0; i < tutor.rooms.length; i += 1) {
              if (tutor.rooms[i].student.equals(req.user._id)) {
                const room = await Room.findByIdAndDelete(tutor.rooms[i].room);
                tutor.rooms.splice(i, 1);
                break;
              }
            }

            course.save();
            return res.json({success: "Succesfully left tutor"});

          } else {
            return res.json({error: "You are not a student of this tutor"});
          }
        }
      }
    }

  })().catch(err => {
    console.log(err)
    res.json({error: "Error accessing course"});
  });
});

router.put('/close-lessons/:id', middleware.isLoggedIn, (req, res) => {
  Course.findById(req.params.id, (err, course) => {
    if (err || !course) {
      res.json({error: "Error closing lessons"});

    } else {
      for (let tutor of course.tutors) {
        if (tutor.tutor.equals(req.user._id)) {
          tutor.available = false;
          course.save();
          res.json({success: "Successfully closed lessons"});
        }
      }
    }
  });
});

router.put('/reopen-lessons/:id', middleware.isLoggedIn, (req, res) => {
  Course.findById(req.params.id, (err, course) => {
    if (err || !course) {
      res.json({error: "Error closing lessons"});

    } else {
      for (let tutor of course.tutors) {
        if (tutor.tutor.equals(req.user._id)) {
          tutor.available = true;
          course.save();
          res.json({success: "Successfully closed lessons"});
        }
      }
    }
  });
});

router.get('/tutors/:id', middleware.isLoggedIn, (req, res) => {
  (async() => {
    const course = await Course.findById(req.params.id).populate("tutors.tutor").populate({path: "tutors.reviews.review", populate: {path: "sender"}});
    if (!course) {
      req.flash('error', "Unable to find course");
      return res.redirect('back');

    }

    for (let tutor of course.tutors) {
      if (tutor.tutor._id.equals(req.query.tutor)) {

        let studentIds = [];
        for (let student of course.students) {
          studentIds.push(student.toString());
        }

        let enrolledCourses = [];
        const courses = await Course.find({});

        for (let course of courses) {
          for (let t of course.tutors) {
            if (t.tutor.equals(tutor.tutor._id)) {
              enrolledCourses.push(course);
            }
          }
        }

        res.render('homework/tutor-show', {course, tutor, studentIds, courses: enrolledCourses});
      }
    }

  })().catch(err => {
    req.flash('error', "Unable to find course");
    res.redirect('back');
  });
});

router.put('/like-review/:id', middleware.isLoggedIn, middleware.isStudent, (req, res) => {
  PostComment.findById(req.params.id, (err, review) => {
    if (err || !review) {
      res.json({error: "Error accessing review"});

    } else {
      if (review.likes.includes(req.user._id)) {
        review.likes.splice(review.likes.indexOf(req.user._id), 1);
        review.save();
        res.json({success: "Removed a like", likeCount: review.likes.length, review});

      } else {
        review.likes.push(req.user._id);
        review.save();
        res.json({success: "Liked", likeCount: review.likes.length});
      }
    }
  });
});

module.exports = router;
