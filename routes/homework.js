//Homework routes dictate interactions between teachers, tutors and students

//LIBRARIES
const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat');
const {transport, transport_mandatory} = require("../transport");

//SCHEMA
const User = require('../models/user');
const Notification = require('../models/message');
const Course = require('../models/course');
const PostComment = require('../models/postComment');
const Room = require('../models/room');

//RESTful routing 'index'
router.get('/', middleware.isLoggedIn, (req, res) => {
  Course.find({}, (err, courses) => {
    if (err || !courses) {
      req.flash('error', "Unable to find courses");
      res.redirect('back');

    } else {
      //Collect all courses that this user is part of
      let courseList = [];
      let userIncluded;
      for (let course of courses) {

        // If the user is a teacher or student in the course
        if ((course.teacher.equals(req.user._id)) || (course.students.includes(req.user._id))) {
          courseList.push(course);

        //If not, evaluate tutors
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
  });
});

//RESTful routing 'create' (Create course)
router.post('/', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {
  if (req.body.title.replace(' ', '') != '') { //Make sure that the course has a name

    //Build join code
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

    //Create course with specified information
    Course.create({name: req.body.title, joinCode, description: req.body.description, active: true, teacher: req.user}, (err, course) => {
      if (err || !course) {
        req.flash('error', "Unable to create course");
        res.redirect('back');

      } else {

        //If a thumbnail has been provided, replace default with it
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

//Join course as a student
router.post('/join', middleware.isLoggedIn, middleware.isStudent, (req, res) => {
  Course.findOne({joinCode: req.body.joincode}, (err, course) => {

    //If course does not exist
    if (err || !course) {
      req.flash('error', "No courses matching this join code were found.");
      res.redirect('back');

    //If user is enrolled as a student
    } else if (course.students.includes(req.user._id)) {
      req.flash('error', `You are already enrolled in ${course.name} as a student.`);
      res.redirect('back');

    //If user is blocked from course
    } else if (course.blocked.includes(req.user._id)) {
      req.flash('error', `You are blocked from joining ${course.name}.`);
      res.redirect('back');

    } else { //Add user to course's students

      //Check if user is a tutor in the course
      let enrolledAsTutor = false;
      for (let tutor of course.tutors) {
        if (tutor.tutor.equals(req.user._id)) {
          enrolledAsTutor = true;
          req.flash('error', `You have already joined ${course.name} as a tutor.`);
          res.redirect('back');
        }
      }

      //If not, enroll them
      if (!enrolledAsTutor) {
        course.students.push(req.user);
        course.save();
        req.flash('success', `Successfully joined ${course.name}!`);
        res.redirect(`/homework/${course._id}`);
      }
    }
  });
});

//Join course as tutor
router.post('/join-tutor', middleware.isLoggedIn, middleware.isTutor, (req, res) => {
  Course.findOne({joinCode: req.body.joincode}, (err, course) => {

    //If course does not exist
    if (err || !course) {
      req.flash('error', "No courses matching this join code were found.");
      res.redirect('back');

      //If user is enrolled as a student
    } else if (course.students.includes(req.user._id)) {
      req.flash('error', `You are already enrolled in ${course.name} as a student.`);
      res.redirect('back');

      //If user is blocked from course
    } else if (course.blocked.includes(req.user._id)) {
      req.flash('error', `You are blocked from joining ${course.name}.`);
      res.redirect('back');

    } else {

      //Check if user is a tutor in the course
      let enrolledAsTutor = false;
      for (let tutor of course.tutors) {
        if (tutor.tutor.equals(req.user._id)) {
          enrolledAsTutor = true;
          req.flash('error', `You have already joined ${course.name} as a tutor.`);
          res.redirect('back');
        }
      }

      //If not, enroll them as a tutor
      if (!enrolledAsTutor) {
        course.tutors.push({tutor: req.user, bio: req.body.bio, slots: parseInt(req.body.slots), available: (parseInt(req.body.slots) > 0), dateJoined: new Date(Date.now())});
        course.save();
        req.flash('success', `Successfully joined ${course.name} as a tutor!`);
        res.redirect(`/homework/${course._id}`);
      }
    }
  });
});

//RESTful routing show route
router.get('/:id', middleware.isLoggedIn, (req, res) => {
  (async() => {
    const course = await Course.findById(req.params.id).populate('teacher').populate('students').populate('tutors.tutor').populate('tutors.reviews.review').populate('blocked');
    if (!course) {
      req.flash('error', "Unable to find course");
      return res.redirect('back');
    }

    //Collect info on the ids of all students and tutors in the course
    let studentIds = [];
    let tutorIds = [];
    for (let student of course.students) {
      studentIds.push(student._id.toString());
    }

    for (let tutor of course.tutors) {
      tutorIds.push(tutor.tutor._id.toString());
    }

    const teachers = await User.find({authenticated: true, status: "faculty", _id: {$ne: req.user._id}});
    if (!teachers) {
      req.flash('error', "Unable to find teachers");
      return res.redirect('back');
    }

    //If user is a tutor, teacher or student, show the course
    if (course.teacher.equals(req.user._id) || studentIds.includes(req.user._id.toString()) || tutorIds.includes(req.user._id.toString())) {
      res.render('homework/show', {course, studentIds, tutorIds, teachers});

    } else {
      req.flash('error', "You do not have permission to view that course");
      res.redirect('back');
    }

  })().catch(err => {
    if (err) {
      req.flash('error', "Unable to find course");
      return res.redirect('back');
    }
  });
});

//RESTful routing update route
router.put('/:id', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {
  Course.findById(req.params.id, (err, course) => {
    if (err || !course) {
      res.json({error: "An Error Occurred"});

      //If the user is not the course's teacher, this action is illegal
    } else if (!course.teacher.equals(req.user._id)) {
      res.json({error: "You are not a teacher of this course"});

    } else {
      //Iterate through each of the data's keys and update the course with the corresponding value
      for (let attr in req.body) {
        course[attr] = req.body[attr];
      }

      course.save();
      res.json({success: "Succesfully Updated Course Information"});
    }
  });
});

router.put('/updateTeacher/:id', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {
  (async() => {
    const course = await Course.findById(req.params.id);
    if (!course) {
      req.flash("error", "Unable to find course");
      return res.redirect("back");
    }

    if (!course.teacher.equals(req.user._id)) {
      req.flash("error", "You are not a teacher of this course");
      return res.redirect("back");
    }

    if (!(course.joinCode == req.body.joinCodeConfirm)) {
      req.flash("error", "Join code is invalid");
      return res.redirect("back");
    }

    const newTeacher = await User.findById(req.body.teacher);
    if (!newTeacher) {
      req.flash("error", "Error finding teacher");
      return res.redirect("back");
    }

    course.teacher = newTeacher;
    await course.save();
    req.flash("success", "Updated course teacher!");
    res.redirect("/homework")

  })().catch(err => {
    req.flash("error", "Unable to update teacher");
    res.redirect("back");
  });
});

//Update course join code
router.put('/joinCode/:id', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {

  //Generate join code
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

      //If user is not the course's teacher, they cannot update the join code
    } else if (!course.teacher.equals(req.user._id)) {
      res.json({error: "You are not a teacher of this course"});

    } else {
      course.joinCode = joinCode;
      course.save();
      res.json({success: "Succesfully Updated Join Code", joinCode});
    }
  });
});

//Edit tutor bio
router.put("/bio/:id", middleware.isLoggedIn, middleware.isTutor, (req, res) => {
  Course.findById(req.params.id, (err, course) => {
    if (err || !course) {
      res.json({error: "Unable to find course"});

    } else {
      //Iterate through tutors and search for current user
      for (let tutor of course.tutors) {
        if (tutor.tutor.equals(req.user._id)) {

          //If id matches, update bio
          tutor.bio = req.body.bio;
          course.save();
          res.json({success: "Successfully changed"})
        }
      }
    }
  });
});

//Unenroll from student status (leave course if user is a student)
router.post('/unenroll-student/:id', middleware.isLoggedIn, middleware.isStudent, (req, res) => {
  (async() => {
    //Remove user from course's students
    const course = await Course.findByIdAndUpdate(req.params.id, {$pull: {students: req.user._id}}).populate("tutors.tutor");

    if (!course) {
      req.flash('error', "Unable to find course");
      return res.redirect('back');
    }

    //Remove user from all tutors they have signed up with, and delete corresponding chat rooms
    let deletedRoom;
    for (let tutor of course.tutors) {

      if (tutor.students.includes(req.user._id)) {

        //Update the tutor's students array
        tutor.formerStudents.push(req.user._id);
        tutor.students.splice(tutor.students.indexOf(req.user._id), 1);
        tutor.slots += 1;
        tutor.available = true;

        //Update the tutor's rooms array
        for (let i = 0; i < tutor.rooms.length; i ++) {
          if (tutor.rooms[i].student.equals(req.user._id)) {
            deletedRoom = await Room.findByIdAndDelete(tutor.rooms[i].room);

            if (!deletedRoom) {
              req.flash('error', "Unable to find room");
              return res.redirect('back');
            }

            if (req.user.newRoomCount.includes(deletedRoom._id)) {
              req.user.newRoomCount.splice(req.user.newRoomCount.indexOf(deletedRoom._id), 1);
              await req.user.save();
            }

            if (tutor.tutor.newRoomCount.includes(deletedRoom._id)) {
              tutor.tutor.newRoomCount.splice(tutor.tutor.newRoomCount.indexOf(deletedRoom._id), 1);
              await tutor.tutor.save();
            }

            tutor.rooms.splice(i, 1);
          }
        }
      }
    }

    await course.save();
    req.flash('success', `Unenrolled from ${course.name}!`);
    return res.redirect('/homework');

  })().catch(err => {
    req.flash('error', "Unable to unenroll from course");
    res.redirect('back');
  });
});

//Unenroll from tutor status (leave course if user is a tutor)
router.post('/unenroll-tutor/:id', middleware.isLoggedIn, middleware.isTutor, (req, res) => {
  (async() => {
    const course = await Course.findById(req.params.id).populate('tutors.tutor').populate('tutors.rooms.student');

    if (!course) {
      req.flash('error', "Unable to find course");
      return res.redirect('back');
    }

    for (let i = course.tutors.length-1; i >= 0; i --) {
      if (course.tutors[i].tutor._id.equals(req.user._id)) { //If the selected tutor is the current user

        //Remove all the tutor's rooms and update the corresponding students
        let deletedRoom;
        for (let room of course.tutors[i].rooms) {
          deletedRoom = await Room.findByIdAndDelete(room.room);

          if (!deletedRoom) {
            req.flash('error', "Unable to remove chat room");
            return res.redirect('back');
          }

          if (room.student.newRoomCount.includes(deletedRoom._id)) {
            room.student.newRoomCount.splice(room.student.newRoomCount.indexOf(deletedRoom._id), 1);
            await room.student.save();
          }

          if (req.user.newRoomCount.includes(deletedRoom._id)) {
            req.user.newRoomCount.splice(req.user.newRoomCount.indexOf(deletedRoom._id), 1);
            await req.user.save();
          }
        }

        course.tutors.splice(i, 1); //Remove tutor from course
        break;
      }
    }

    await course.save();
    req.flash('success', `Unenrolled from ${course.name}!`);
    return res.redirect('/homework');

  })().catch(err => {
    if (err) {
      req.flash("error", "Unable to unenroll");
      res.redirect("back");
    }
  });
});

//Book a tutor
router.put('/book/:id', middleware.isLoggedIn, middleware.isStudent, (req, res) => {
  (async() => {

    const course = await Course.findById(req.params.id).populate('tutors.tutor');

    if (!course) {
      return res.json({error: "Error accessing course"});

    } else if (!course.students.includes(req.user._id)) {
      return res.json({error: "You are not a student in that course"});

    } else {
      let formerStudent = false;

      //Iterate through tutors and search for the corresponding one
      for (let tutor of course.tutors) {
        if (tutor.tutor._id.equals(req.body.tutorId) && tutor.available) {
          tutor.students.push(req.user._id);

          //Remove student from tutor's former students (if they were there)
          if (tutor.formerStudents.includes(req.user._id)) {
            formerStudent = true;
            tutor.formerStudents.splice(tutor.formerStudents.indexOf(req.user._id), 1);
          }

          tutor.slots -= 1;
          if (tutor.slots == 0) {
            tutor.available = false;
          }

          //Create chat room between student and tutor
          const room = await Room.create({
            name: `${req.user.firstName}'s Tutoring Sessions With ${tutor.tutor.firstName} - ${course.name}`,
            creator: {id: tutor._id, username: tutor.username},
            members: [req.user._id, tutor.tutor._id],
            type: "private",
            mutable: false
          });

          //Add student to object and put it into tutor object
          const roomObject = {
            student: req.user._id,
            room: room._id
          };

          tutor.tutor.newRoomCount.push(room._id);
          req.user.newRoomCount.push(room._id);
          await tutor.tutor.save();
          await req.user.save();

          tutor.rooms.push(roomObject);
          await course.save();

          const studentIds = await User.find({authenticated: true, _id: {$in: tutor.students}});
          if (!studentIds) {
            return res.json({error: "Error accessing students"});
          }

          return res.json({success: "Succesfully joined tutor", user: req.user, room: roomObject.room, tutor, formerStudent, students: studentIds});
        }
      }
    }

  })().catch(err => {
    res.json({error: "Error accessing course"});
  });
});

//Upvote a tutor
router.put('/upvote/:id', middleware.isLoggedIn, middleware.isStudent, (req, res) => {
  Course.findById(req.params.id, (err, course) => {
    if (err || !course) {
      res.json({error: "Error upvoting tutor"});

    } else {
      for (let tutor of course.tutors) {

        //Search for tutor until they are found
        if (tutor.tutor.equals(req.body.tutorId)) {

          //Only current/former students of a tutor can upvote them
          if (tutor.students.includes(req.user._id) || tutor.formerStudents.includes(req.user._id)) {

            //If tutor is currently upvoted by this user, downvote them
            if (tutor.upvotes.includes(req.user._id)) {
              tutor.upvotes.splice(tutor.upvotes.indexOf(req.user._id), 1);
              course.save();
              res.json({success: "Downvoted tutor", upvoteCount: tutor.upvotes.length});

            //If tutor is currently not upvoted by this user, upvote them
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

//Submit a review for a tutor
router.put('/rate/:id', middleware.isLoggedIn, middleware.isStudent, (req, res) => {
  (async() => {

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.json({error: "Error reviewing tutor"});
    }

    for (let tutor of course.tutors) {
      if (tutor.tutor.equals(req.body.tutorId)) {
        //Only current/former students of a tutor can upvote them
        if (tutor.students.includes(req.user._id) || tutor.formerStudents.includes(req.user._id)) {

          //Create PostComment schema with review information
          let review = await PostComment.create({text: req.body.review, sender: req.user});
          if (!review) {
            return res.json({error: "Error reviewing tutor"});
          }

          review.date = dateFormat(review.created_at, "h:MM TT | mmm d");
          await review.save();

          //Create review object with rating and comment, and save it to the tutor's reviews
          const reviewObject = {review, rating: req.body.rating};
          tutor.reviews.push(reviewObject);
          await course.save();

          //Calculate the tutor's average rating based on all their reviews
          let averageRating = 0;
          for (let review of tutor.reviews) {
            averageRating += review.rating;
          }

          averageRating = Math.round(averageRating/tutor.reviews.length);

          return res.json({success: "Succesfully upvoted tutor", averageRating, reviews_length: tutor.reviews.length, review: reviewObject, user: req.user});

        }

        return res.json({error: "You are not a student of this tutor"});
      }
    }

  })().catch(err => {
    res.json({error: "Error rating tutor"});
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

      //If the selected tutor is the one being left, and the user is a student of that tutor, leave
      if (tutor.tutor._id.equals(req.body.tutorId)) {
        if (tutor.students.includes(req.user._id)) {

          //Update tutor info
          tutor.students.splice(tutor.students.indexOf(req.user._id), 1);

          if (!tutor.formerStudents.includes(req.user._id)) {
            tutor.formerStudents.push(req.user._id);
          }

          tutor.slots += 1;
          tutor.available = true;

          //Update tutor rooms
          for (let i = 0; i < tutor.rooms.length; i += 1) {
            if (tutor.rooms[i].student.equals(req.user._id)) {
              const room = await Room.findByIdAndDelete(tutor.rooms[i].room);
              tutor.tutor.newRoomCount.splice(tutor.tutor.newRoomCount.indexOf(tutor.rooms[i].room));
              req.user.newRoomCount.splice(tutor.tutor.newRoomCount.indexOf(tutor.rooms[i].room));
              await tutor.tutor.save();
              await req.user.save();
              tutor.rooms.splice(i, 1);
              break;
            }
          }

          await course.save();
          return res.json({success: "Succesfully left tutor", user: req.user});

        } else {
          return res.json({error: "You are not a student of this tutor"});
        }
      }
    }

  })().catch(err => {
    res.json({error: "Error accessing course"});
  });
});

//For a tutor to make themself unavailable to more students
router.put('/close-lessons/:id', middleware.isLoggedIn, (req, res) => {
  Course.findById(req.params.id, (err, course) => {
    if (err || !course) {
      res.json({error: "Error closing lessons"});

    } else {
      for (let tutor of course.tutors) {
        //If the selected tutor matches the current user, shut down availability
        if (tutor.tutor.equals(req.user._id)) {
          tutor.available = false;
          course.save();
          res.json({success: "Successfully closed lessons"});
        }
      }
    }
  });
});

//For a tutor to make themself available to more students
router.put('/reopen-lessons/:id', middleware.isLoggedIn, (req, res) => {
  Course.findById(req.params.id, (err, course) => {
    if (err || !course) {
      res.json({error: "Error closing lessons"});

    } else {
      for (let tutor of course.tutors) {
        //If the selected tutor matches the current user, reopen availability
        if (tutor.tutor.equals(req.user._id)) {
          tutor.available = true;
          course.save();
          res.json({success: "Successfully closed lessons"});
        }
      }
    }
  });
});

//HANDLE
//RESTful routing "tutors/show" page
router.get('/tutors/:id', middleware.isLoggedIn, (req, res) => {
  (async() => {
    const course = await Course.findById(req.params.id).populate("tutors.tutor").populate("tutors.formerStudents").populate({path: "tutors.reviews.review", populate: {path: "sender"}});
    if (!course) {
      req.flash('error', "Unable to find course");
      return res.redirect('back');
    }

    let tutorIds = [];
    for (let tutor of course.tutors) {
      tutorIds.push(tutor.tutor._id.toString());
    }

    let courseStudents = [];
    for (let student of course.students) {
      courseStudents.push(student.toString());
    }

    for (let tutor of course.tutors) {
      //If selected tutor matches the requested tutor, display them
      if (tutor.tutor._id.equals(req.query.tutorId)) {

        //Collect info on all students who are members of this tutor
        let studentIds = [];
        for (let student of course.students) {
          studentIds.push(student.toString());
        }

        //Collect all courses which this tutor teaches (that are not the current one)
        let enrolledCourses = [];
        const courses = await Course.find({_id: {$ne: course._id}}).populate("teacher");

        for (let course of courses) {
          for (let t of course.tutors) {
            if (t.tutor.equals(tutor.tutor._id)) {
              enrolledCourses.push(course);
            }
          }
        }

        //Collect info on the entire schema for each student (necessary to have one array of just ids, and one of the entire object, for FE display)
        const students = await User.find({authenticated: true, _id: {$in: tutor.students}});
        if (!students) {
          req.flash('error', "Unable to find students");
          return res.redirect('back');
        }

        if (req.query.studentId) {

          const student = await User.findById(req.query.studentId);
          if (!student) {
            req.flash('error', "Unable to find students");
            return res.redirect('back');
          }

          if (student._id.equals(req.user._id) || tutor.tutor._id.equals(req.user._id)) {
            return res.render('homework/lessons', {course, tutor, student});

          } else {
            req.flash('error', "You do not have permission to view that student");
            return res.redirect('back');
          }

        } else {

          if (courseStudents.includes(req.user._id.toString()) || course.teacher.equals(req.user._id) || tutorIds.includes(req.user._id.toString())) {
            return res.render('homework/tutor-show', {course, tutor, students, studentIds, courses: enrolledCourses});

          } else {
            req.flash('error', "You do not have permission to view that tutor");
            return res.redirect('back');
          }
        }
      }
    }

  })().catch(err => {
    req.flash('error', "Unable to find course");
    res.redirect('back');
  });
});

//Like a tutor's review (front-end JS prevents non-students from liking a review)
router.put('/like-review/:id', middleware.isLoggedIn, middleware.isStudent, (req, res) => {
  PostComment.findById(req.params.id, (err, review) => {
    if (err || !review) {
      res.json({error: "Error accessing review"});

    } else {
      //Update the review's likes
      if (review.likes.includes(req.user._id)) { //If user has liked this review, remove a like
        review.likes.splice(review.likes.indexOf(req.user._id), 1);
        review.save();
        res.json({success: "Removed a like", likeCount: review.likes.length, review});

      } else { //If user has not liked this review, like it
        review.likes.push(req.user._id);
        review.save();
        res.json({success: "Liked", likeCount: review.likes.length});
      }
    }
  });
});

//For tutors to set availability on new students
router.put('/set-students/:id', (req, res) => {
  Course.findById(req.params.id, (err, course) => {
    if (err || !course) {
      res.json({error: "Error accessing course"});

    } else {
      //Search through tutors to find requested tutor
      let found = false;
      for (let tutor of course.tutors) {
        if (tutor.tutor.equals(req.user._id)) {
          found = true;

          //Update slots based on data
          tutor.slots = parseInt(req.body.slots)-tutor.students.length;

          //Update availability based on new slot info
          if ((parseInt(req.body.slots)-tutor.students.length) == 0) {
            tutor.available = false;
          }

          course.save();
          res.json({success: "Succesfully changed", tutor});
        }
      }

      if (!found) {
        res.json({error: "Unable to find tutor"});
      }
    }
  });
});

//For teachers to remove and block a student from a course
router.put('/remove-student/:id', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {
  (async() => {
    const studentId = await User.findById(req.body.studentId);

    if (!studentId) {
      return res.json({error: "Error removing student"});
    }

    const course = await Course.findById(req.params.id).populate('tutors.tutor').populate('tutors.rooms.student');

    if (!course) {
      return res.json({error: "Error removing student"});

      //If user is not a teacher of the course, this action is not permitted
    } else if (!course.teacher.equals(req.user._id)) {
      return res.json({error: "You are not a teacher of this course"});
    }

    //Remove all relationships with tutors
    let deletedRoom;
    for (let tutor of course.tutors) {
      //For all tutors that have this student
      if (tutor.students.includes(studentId._id)) {
        tutor.formerStudents.push(studentId._id);
        //Remove student from tutor
        tutor.students.splice(tutor.students.indexOf(studentId._id), 1);

        //Remove all rooms in this student's name
        for (let i = 0; i < tutor.rooms.length; i ++) {
          if (tutor.rooms[i].student._id.equals(studentId._id)) {
            deletedRoom = await Room.findByIdAndDelete(tutor.rooms[i].room);

            if (!deletedRoom) {
              return res.json({error: "Error removing tutor"});
            }

            //Update tutor's and student's newRoomCount (new chat rooms) accordingly
            if (tutor.rooms[i].student.newRoomCount.includes(deletedRoom._id)) {
              tutor.rooms[i].student.newRoomCount.splice(tutor.rooms[i].student.newRoomCount.indexOf(deletedRoom._id), 1);
              await tutor.rooms[i].student.save();
            }

            if (tutor.tutor.newRoomCount.includes(deletedRoom._id)) {
              tutor.tutor.newRoomCount.splice(tutor.tutor.newRoomCount.indexOf(deletedRoom._id), 1);
              await tutor.tutor.save();
            }
          }

          //Officially remove room from tutor
          tutor.rooms.splice(i, 1);
        }
      }
    }

    //Create a notification to alert student that they have been removed
    const notif = await Notification.create({subject: `Removal from ${course.name}`, text: `You were removed from ${course.name} for the following reason:\n"${req.body.reason}"`, sender: req.user, noReply: true, recipients: [studentId], read: [], toEveryone: false, images: []}); //Create a notification to alert the user
    if (!notif) {
      return res.json({error: "Error removing student"});
    }

    notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
    await notif.save()

    studentId.inbox.push(notif);
    studentId.msgCount += 1;
    await studentId.save();

    //Send email to alert student that they have been removed
    transport(studentId, `Removal from ${course.name}`, `<p>Hello ${studentId.firstName},</p><p>${notif.text}</p>`);

    //Block student
    course.blocked.push(studentId);
    for (let i = 0; i < course.students.length; i ++) {
      if (course.students[i]._id.equals(studentId._id)) {
        course.students.splice(i, 1);
        await course.save();
        return res.json({success: "Succesfully removed student", student: studentId, course});
      }
    }

  })().catch(err => {
    res.json({error: "Error removing student"});
  });
});

//For teachers to remove and block a tutor from a course
router.put('/remove-tutor/:id', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {
  (async() => {

    let tutorId;
    if (req.body.show) {
      tutorId = await User.findById(req.body.tutorId);

      if (!tutorId) {
        return res.json({error: "Error removing tutor"});
      }

    } else {
      tutorId = await User.findById(req.query.tutorId);

      if (!tutorId) {
        req.flash("error", "Error removing tutor");
        return res.redirect("back");
      }
    }

    const course = await Course.findById(req.params.id).populate('tutors.tutor').populate('tutors.rooms.student');

    if (!course) {
      if (req.body.show) {
        return res.json({error: "Error removing tutor"});

      } else {
        req.flash("error", "Error removing tutor");
        return res.redirect("back");
      }

      //If user is not a teacher of the course, this action is not permitted
    } else if (!course.teacher.equals(req.user._id)) {
      if (req.body.show) {
        return res.json({error: "You are not a teacher of this course"});

      } else {
        req.flash("error", "You are not a teacher of this course");
        return res.redirect("back");
      }
    }

    for (let i = 0; i < course.tutors.length; i ++) {
      if (course.tutors[i].tutor._id.equals(tutorId._id)) {

        //For all of the tutor's rooms, remove room and update students' new room counts
        let deletedRoom;
        for (let room of course.tutors[i].rooms) {
          deletedRoom = await Room.findByIdAndDelete(room.room);

          if (!deletedRoom) {
            if (req.body.show) {
              return res.json({error: "Error removing tutor"});

            } else {
              req.flash("error", "Error removing tutor");
              return res.redirect("back");
            }
          }

          if (room.student.newRoomCount.includes(deletedRoom._id)) {
            room.student.newRoomCount.splice(room.student.newRoomCount.indexOf(deletedRoom._id), 1);
            await room.student.save();
          }

          if (tutorId.newRoomCount.includes(deletedRoom._id)) {
            tutorId.newRoomCount.splice(tutorId.newRoomCount.indexOf(deletedRoom._id), 1);
          }
        }

        //Create a notification to alert tutor that they have been removed
        const notif = await Notification.create({subject: `Removal from ${course.name}`, text: `You were removed from ${course.name} for the following reason:\n"${req.body.reason}"`, sender: req.user, noReply: true, recipients: [tutorId], read: [], toEveryone: false, images: []}); //Create a notification to alert the user
        if (!notif) {
          if (req.body.show) {
            return res.json({error: "Error removing tutor"});

          } else {
            req.flash("error", "Error removing tutor");
            return res.redirect("back");
          }
        }

        notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
        await notif.save();

        tutorId.inbox.push(notif);
        tutorId.msgCount += 1;
        await tutorId.save();

        //Send email to tutor that they have been removed
        transport(tutorId, `Removal from ${course.name}`, `<p>Hello ${tutorId.firstName},</p><p>${notif.text}</p>`);

        //Remove tutor and block them
        course.blocked.push(tutorId);
        course.tutors.splice(i, 1);
        await course.save();

        if (req.body.show) {
          return res.json({success: "Succesfully removed tutor", tutor: tutorId, course});

        } else {
          req.flash("success", "Succesfully Removed Tutor!");
          return res.redirect(`/homework/${course._id}`);
        }
      }
    }

  })().catch(err => {
    console.log(err);
    if (req.body.show) {
      res.json({error: "Error removing tutor"});

    } else {
      req.flash("error", "Error removing tutor");
      res.redirect("back");
    }
  });
});

//Unblock a user from joining a course
router.put('/unblock/:id', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {
  (async() => {
    const blockedId = await User.findById(req.body.blockedId);

    if (!blockedId) {
      return res.json({error: "Unable to access user"});
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.json({error: "Unable to access course"});

      //If user is not a teacher of the course, this action is not permitted
    } else if (!course.teacher.equals(req.user._id)) {
      return res.json({error: "You are not a teacher of this course"});

      //If the user is not blocked, they cannot be unblocked
    } else if (!course.blocked.includes(blockedId._id)) {
      return res.json({error: "User is not blocked from this course"});
    }

    //Unblock user
    course.blocked.splice(course.blocked.indexOf(blockedId._id), 1);
    await course.save();

    //Create a notification to alert user that they have been unblocked
    const notif = await Notification.create({subject: `Unblocked from ${course.name}`, text: `You have been unblocked from ${course.name}. You can rejoin with the join code now whenever you need to.`, sender: req.user, noReply: true, recipients: [blockedId], read: [], toEveryone: false, images: []}); //Create a notification to alert the user
    if (!notif) {
      return res.json({error: "Error removing student"});
    }

    notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
    await notif.save();

    blockedId.inbox.push(notif);
    blockedId.msgCount += 1;
    await blockedId.save();

    //Send email to user that they have been unblocked
    transport(blockedId, `Unblocked from ${course.name}`, `<p>Hello ${blockedId.firstName},</p><p>${notif.text}</p>`);

    return res.json({success: "Succesfully unblocked user", blocked: blockedId, course});

  })().catch(err => {
    res.json({error: "Unable to unblock user"});
  });
});

router.put("/mark/:id", middleware.isLoggedIn, middleware.isTutor, (req, res) => {
  (async() => {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.json({error: "Error accessing course"});
    }

    for (let tutor of course.tutors) {
      if (tutor.tutor.equals(req.user._id)) {

        const studentId = await User.findById(req.body.studentId);

        if (!studentId) {
          return res.json({error: "Error accessing student"});
        }

        if (tutor.tutor.equals(req.user._id)) {

          let lessonObject = {
            student: studentId._id,
            time: req.body.time,
            date: dateFormat(new Date(), "mmm d"),
            summary: req.body.summary
          }

          tutor.lessons.push(lessonObject);
          await course.save();
          return res.json({success: "Succesfully updated", lesson: lessonObject, student: studentId, tutor});
        }
      }
    }
  })().catch(err => {
    res.json({error: "Error marking lesson"});
  });
});

module.exports = router;
