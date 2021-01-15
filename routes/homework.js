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

    } else if (course.blocked.includes(req.user._id)) {
      req.flash('error', `You are blocked from joining ${course.name}.`);
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

    } else if (course.blocked.includes(req.user._id)) {
      req.flash('error', `You are blocked from joining ${course.name}.`);
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
  Course.findById(req.params.id).populate('teacher').populate('students').populate('tutors.tutor').populate('tutors.reviews.review').populate('blocked').exec((err, course) => {
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
  Course.findById(req.params.id, (err, course) => {
    if (err || !course) {
      res.json({error: "An Error Occurred"});

    } else if (!course.teacher.equals(req.user._id)) {
      res.json({error: "You are not a teacher of this course"});

    } else {
      for (let attr in req.body) {
        course[attr] = req.body[attr];
      }

      course.save();
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

  Course.findById(req.params.id, (err, course) => {
    if (err || !course) {
      res.json({error: "An Error Occurred"});

    } else if (!course.teacher.equals(req.user._id)) {
      res.json({error: "You are not a teacher of this course"});

    } else {
      course.joinCode = joinCode;
      course.save();
      res.json({success: "Succesfully Updated Join Code", joinCode});
    }
  });
});

router.post('/unenroll-student/:id', middleware.isLoggedIn, middleware.isStudent, (req, res) => {
  (async() => {
    const course = await Course.findByIdAndUpdate(req.params.id, {$pull: {students: req.user._id}}).populate("tutors.tutor");

    if (!course) {
      req.flash('error', "Unable to find course");
      return res.redirect('back');
    }

    let deletedRoom;
    for (let tutor of course.tutors) {
      if (tutor.students.includes(req.user._id)) {
        tutor.formerStudents.push(req.user._id);
        tutor.students.splice(tutor.students.indexOf(req.user._id), 1);
        tutor.slots += 1;
        tutor.available = true;

        for (let i = 0; i < tutor.rooms.length; i ++) {
          if (tutor.rooms[i].student.equals(req.user._id)) {
            deletedRoom = await Room.findByIdAndDelete(tutor.rooms[i].room);

            if (!deletedRoom) {
              req.flash('error', "Unable to find room");
              return res.redirect('back');
            }

            if (req.user.newRoomCount.includes(deletedRoom._id)) {
              req.user.newRoomCount.splice(req.user.newRoomCount.indexOf(deletedRoom._id), 1);
              req.user.save();
            }

            if (tutor.tutor.newRoomCount.includes(deletedRoom._id)) {
              tutor.tutor.newRoomCount.splice(tutor.tutor.newRoomCount.indexOf(deletedRoom._id), 1);
              tutor.tutor.save();
            }

            tutor.rooms.splice(i, 1);
          }
        }
      }
    }

    course.save();
    req.flash('success', `Unenrolled from ${course.name}!`);
    return res.redirect('/homework');

  })().catch(err => {
    req.flash('error', "Unable to unenroll from course");
    res.redirect('back');
  });
});

router.post('/unenroll-tutor/:id', middleware.isLoggedIn, middleware.isTutor, (req, res) => {
  (async() => {
    const course = await Course.findById(req.params.id).populate('tutors.tutor').populate('tutors.rooms.student');

    if (!course) {
      req.flash('error', "Unable to find course");
      return res.redirect('back');
    }

    for (let i = course.tutors.length-1; i >= 0; i --) {
      if (course.tutors[i].tutor._id.equals(req.user._id)) {

        let deletedRoom;
        for (let room of course.tutors[i].rooms) {
          deletedRoom = await Room.findByIdAndDelete(room.room);

          if (!deletedRoom) {
            req.flash('error', "Unable to remove chat room");
            return res.redirect('back');
          }

          if (room.student.newRoomCount.includes(deletedRoom._id)) {
            room.student.newRoomCount.splice(room.student.newRoomCount.indexOf(deletedRoom._id), 1);
            room.student.save();
          }

          if (req.user.newRoomCount.includes(deletedRoom._id)) {
            req.user.newRoomCount.splice(req.user.newRoomCount.indexOf(deletedRoom._id), 1);
            req.user.save();
          }
        }

        course.tutors.splice(i, 1);
        break;
      }
    }

    course.save();
    req.flash('success', `Unenrolled from ${course.name}!`);
    return res.redirect('/homework');

  })().catch(err => {
    if (err) {
      console.log(err);
      req.flash("error", "Unable to unenroll");
      res.redirect("back");
    }
  });
});

router.put('/book/:id', middleware.isLoggedIn, middleware.isStudent, (req, res) => {
  (async() => {

    const course = await Course.findById(req.params.id).populate('tutors.tutor');

    if (!course) {
      return res.json({error: "Error accessing course"});

    } else if (!course.students.includes(req.user._id)) {
      return res.json({error: "You are not a student of that tutor"});

    } else {
      let formerStudent = false;
      for (let tutor of course.tutors) {
        if (tutor.tutor._id.equals(req.body.tutorId) && tutor.available) {
          tutor.students.push(req.user._id);

          if (tutor.formerStudents.includes(req.user._id)) {
            formerStudent = true;
            tutor.formerStudents.splice(tutor.formerStudents.indexOf(req.user._id), 1);
          }

          tutor.slots -= 1;
          if (tutor.slots == 0) {
            tutor.available = false;
          }

          const room = await Room.create({
            name: `${req.user.firstName}'s Tutoring Sessions With ${tutor.tutor.firstName} - ${course.name}`,
            creator: {id: tutor._id, username: tutor.username},
            members: [req.user._id, tutor.tutor._id],
            type: "private",
            mutable: false
          });

          const roomObject = {
            student: req.user._id,
            room: room._id
          };

          tutor.tutor.newRoomCount.push(room._id);
          req.user.newRoomCount.push(room._id);
          tutor.tutor.save();
          req.user.save();

          tutor.rooms.push(roomObject);
          course.save();
          return res.json({success: "Succesfully joined tutor", user: req.user, formerStudent});
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

        if (tutor.tutor.equals(req.body.tutorId)) {

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
      if (tutor.tutor.equals(req.body.tutorId)) {
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

          return res.json({success: "Succesfully upvoted tutor", averageRating, reviews_length: tutor.reviews.length, review: reviewObject, user: req.user});

        } else {
          return res.json({error: "You are not a student of this tutor"});
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
    const course = await Course.findById(req.params.id).populate('tutors.tutor');

    if (!course) {
      return res.json({error: "Error leaving course"});
    }

    for (let tutor of course.tutors) {
      if (tutor.tutor._id.equals(req.body.tutorId)) {
        if (tutor.students.includes(req.user._id)) {
          tutor.students.splice(tutor.students.indexOf(req.user._id), 1);

          if (!tutor.formerStudents.includes(req.user._id)) {
            tutor.formerStudents.push(req.user._id);
          }

          tutor.slots += 1;
          tutor.available = true;

          for (let i = 0; i < tutor.rooms.length; i += 1) {
            if (tutor.rooms[i].student.equals(req.user._id)) {
              const room = await Room.findByIdAndDelete(tutor.rooms[i].room);
              tutor.tutor.newRoomCount.splice(tutor.tutor.newRoomCount.indexOf(tutor.rooms[i].room));
              req.user.newRoomCount.splice(tutor.tutor.newRoomCount.indexOf(tutor.rooms[i].room));
              tutor.tutor.save();
              req.user.save();
              tutor.rooms.splice(i, 1);
              break;
            }
          }

          course.save();
          return res.json({success: "Succesfully left tutor", user: req.user});

        } else {
          return res.json({error: "You are not a student of this tutor"});
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
        const courses = await Course.find({_id: {$ne: course._id}});

        for (let course of courses) {
          for (let t of course.tutors) {
            if (t.tutor.equals(tutor.tutor._id)) {
              enrolledCourses.push(course);
            }
          }
        }

        const students = await User.find({_id: {$in: tutor.students}});
        if (!students) {
          req.flash('error', "Unable to find students");
          return res.redirect('back');
        }

        res.render('homework/tutor-show', {course, tutor, students, studentIds, courses: enrolledCourses});
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

router.put('/setStudents/:id', (req, res) => {
  Course.findById(req.params.id, (err, course) => {
    if (err || !course) {
      res.json({error: "Error accessing course"});

    } else {
      let found = false;
      for (let tutor of course.tutors) {
        if (tutor.tutor.equals(req.user._id)) {
          found = true;
          tutor.slots = parseInt(req.body.slots);

          if (parseInt(req.body.slots) == 0) {
            tutor.available = false;
          } else {
            tutor.available = true;
          }

          course.save();
          res.json({success: "Succesfully changed"});
        }
      }

      if (!found) {
        res.json({error: "Unable to find tutor"});
      }
    }
  });
});

router.put('/remove-student/:id', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {
  (async() => {
    const studentId = await User.findById(req.body.studentId);

    if (!studentId) {
      return res.json({error: "Error removing student"});
    }

    const course = await Course.findById(req.params.id).populate('tutors.tutor').populate('tutors.rooms.student');

    if (!course) {
      return res.json({error: "Error removing student"});

    } else if (!course.teacher.equals(req.user._id)) {
      return res.json({error: "You are not a teacher of this course"});
    }

    let deletedRoom;
    for (let tutor of course.tutors) {
      if (tutor.students.includes(studentId._id)) {
        tutor.formerStudents.push(studentId._id);
        tutor.students.splice(tutor.students.indexOf(studentId._id), 1);

        for (let i = 0; i < tutor.rooms.length; i ++) {
          if (tutor.rooms[i].student._id.equals(studentId._id)) {
            deletedRoom = await Room.findByIdAndDelete(tutor.rooms[i].room);

            if (!deletedRoom) {
              return res.json({error: "Error removing tutor"});
            }

            if (tutor.rooms[i].student.newRoomCount.includes(deletedRoom._id)) {
              tutor.rooms[i].student.newRoomCount.splice(tutor.rooms[i].student.newRoomCount.indexOf(deletedRoom._id), 1);
              tutor.rooms[i].student.save();
            }

            if (tutor.tutor.newRoomCount.includes(deletedRoom._id)) {
              tutor.tutor.newRoomCount.splice(tutor.tutor.newRoomCount.indexOf(deletedRoom._id), 1);
              tutor.tutor.save();
            }
          }

          tutor.rooms.splice(i, 1);
        }
      }
    }

    const notif = await Notification.create({subject: `Removal from ${course.name}`, text: `You were removed from ${course.name} for the following reason:\n"${req.body.reason}"`, sender: req.user, noReply: true, recipients: [studentId], read: [], toEveryone: false, images: []}); //Create a notification to alert the user
    if (!notif) {
      return res.json({error: "Error removing student"});
    }

    notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
    notif.save()
    studentId.inbox.push(notif);
    studentId.msgCount += 1;
    studentId.save();

    transport(studentId, `Removal from ${course.name}`, `<p>Hello ${studentId.firstName},</p><p>${notif.text}</p>`);

    course.blocked.push(studentId);
    for (let i = 0; i < course.students.length; i ++) {
      if (course.students[i]._id.equals(studentId._id)) {
        course.students.splice(i, 1);
        course.save();
        return res.json({success: "Succesfully removed student", student: studentId, course});
      }
    }

  })().catch(err => {
    console.log(err);
    res.json({error: "Error removing student"});
  });
});

router.put('/remove-tutor/:id', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {
  (async() => {

    const tutorId = await User.findById(req.body.tutorId);

    if (!tutorId) {
      return res.json({error: "Error removing tutor"});
    }

    const course = await Course.findById(req.params.id).populate('tutors.tutor').populate('tutors.rooms.student');

    if (!course) {
      return res.json({error: "Error removing tutor"});

    } else if (!course.teacher.equals(req.user._id)) {
      return res.json({error: "You are not a teacher of this course"});
    }

    for (let i = 0; i < course.tutors.length; i ++) {
      if (course.tutors[i].tutor._id.equals(tutorId._id)) {

        let deletedRoom;
        for (let room of course.tutors[i].rooms) {
          deletedRoom = await Room.findByIdAndDelete(room.room);

          if (!deletedRoom) {
            return res.json({error: "Error removing tutor"});
          }

          if (room.student.newRoomCount.includes(deletedRoom._id)) {
            room.student.newRoomCount.splice(room.student.newRoomCount.indexOf(deletedRoom._id), 1);
            room.student.save();
          }

          if (tutorId.newRoomCount.includes(deletedRoom._id)) {
            tutorId.newRoomCount.splice(tutorId.newRoomCount.indexOf(deletedRoom._id), 1);
          }
        }

        const notif = await Notification.create({subject: `Removal from ${course.name}`, text: `You were removed from ${course.name} for the following reason:\n"${req.body.reason}"`, sender: req.user, noReply: true, recipients: [tutorId], read: [], toEveryone: false, images: []}); //Create a notification to alert the user
        if (!notif) {
          return res.json({error: "Error removing tutor"});
        }

        notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
        notif.save();

        tutorId.inbox.push(notif);
        tutorId.msgCount += 1;

        transport(tutorId, `Removal from ${course.name}`, `<p>Hello ${tutorId.firstName},</p><p>${notif.text}</p>`);

        tutorId.save();
        course.blocked.push(tutorId);
        course.tutors.splice(i, 1);
        await course.save();
        return res.json({success: "Succesfully removed tutor", tutor: tutorId, course});
      }
    }

  })().catch(err => {
    console.log(err)
    res.json({error: "Error removing tutor"});
  });
});

router.put('/unblock/:id', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {
  (async() => {
    const blockedId = await User.findById(req.body.blockedId);

    if (!blockedId) {
      return res.json({error: "Unable to access user"});
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.json({error: "Unable to access course"});

    } else if (!course.teacher.equals(req.user._id)) {
      return res.json({error: "You are not a teacher of this course"});

    } else if (!course.blocked.includes(blockedId._id)) {
      return res.json({error: "User is not blocked from this course"});
    }

    course.blocked.splice(course.blocked.indexOf(blockedId._id), 1);
    course.save();

    const notif = await Notification.create({subject: `Unblocked from ${course.name}`, text: `You have been unblocked from ${course.name}. You can rejoin with the join code now whenever you need to.`, sender: req.user, noReply: true, recipients: [blockedId], read: [], toEveryone: false, images: []}); //Create a notification to alert the user
    if (!notif) {
      return res.json({error: "Error removing student 3"});
    }

    notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
    notif.save();
    blockedId.inbox.push(notif);
    blockedId.msgCount += 1;
    blockedId.save();

    transport(blockedId, `Unblocked from ${course.name}`, `<p>Hello ${blockedId.firstName},</p><p>${notif.text}</p>`);

    return res.json({success: "Succesfully unblocked user", blocked: blockedId, course});

  })().catch(err => {
    res.json({error: "Unable to unblock user"});
  });
});

module.exports = router;
