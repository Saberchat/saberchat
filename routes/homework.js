//Homework routes control the creation and management of courses, as well as tutors-student relations

const express = require('express');
const middleware = require('../middleware');
const {validateCourse} = require('../middleware/validation');
const {singleUpload} = require('../middleware/multer');
const wrapAsync = require('../utils/wrapAsync');
const hw = require('../controllers/homework'); //Controller
const router = express.Router(); //Router

//General routes
router.route('/')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(hw.index)) //View index
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isFaculty), singleUpload, validateCourse, wrapAsync(hw.createCourse)); //Create new course

//Course-specific routes
router.route('/:id')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.memberOfCourse), wrapAsync(hw.showCourse)) //View specific course
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isFaculty), wrapAsync(middleware.memberOfCourse), singleUpload, wrapAsync(hw.updateSettings)) //Update specific course's settings
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isFaculty), wrapAsync(middleware.memberOfCourse), wrapAsync(hw.deleteCourse)); //Delete course

//Show a specific tutor
router.get('/tutors/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.memberOfCourse), wrapAsync(hw.showTutor)); //RESTful routing "tutors/show" page

//Join/leave requests
router.post('/join', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.notMemberOfCourse), wrapAsync(hw.joinCourse)) //Join course as tutor or student
router.post('/unenroll-student/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isStudent), wrapAsync(middleware.memberOfCourse), wrapAsync(hw.unenrollStudent)); //Leave course as a student
router.post('/unenroll-tutor/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isTutor, wrapAsync(middleware.memberOfCourse), wrapAsync(hw.unenrollTutor)); //Leave course as a tutor

//Teacher put requests
router.put('/updateTeacher/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isFaculty), wrapAsync(middleware.memberOfCourse), wrapAsync(hw.updateTeacher)); //Update course teacher
router.put('/joinCode/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isFaculty), wrapAsync(middleware.memberOfCourse), wrapAsync(hw.updateJoinCode)); //Update course join code
router.put('/remove-student/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isFaculty), wrapAsync(middleware.memberOfCourse), wrapAsync(hw.removeStudent)); //For teachers to remove students from courses
router.put('/remove-tutor/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isFaculty), wrapAsync(middleware.memberOfCourse), wrapAsync(hw.removeTutor)); //For teachers to remove tutors from courses
router.put('/unblock/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isFaculty), wrapAsync(middleware.memberOfCourse), wrapAsync(hw.unblock)); //Unblock a blocked user

//Tutor put requests
router.put("/bio/:id", wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isTutor, wrapAsync(hw.updateBio)); //Edit tutor bio
router.put('/close-lessons/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.memberOfCourse), wrapAsync(hw.closeLessons)); //For a tutor to make themself unavailable
router.put('/reopen-lessons/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.memberOfCourse), wrapAsync(hw.reopenLessons)); //For a tutor to make themself available to students
router.put('/set-students/:id', middleware.isTutor, wrapAsync(middleware.accessToFeature), wrapAsync(middleware.memberOfCourse), wrapAsync(hw.setStudents)); //For tutors to set student capacity
router.put("/mark/:id", wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isTutor, wrapAsync(middleware.memberOfCourse), wrapAsync(hw.markLesson)); //Mark a student's lesson

//Student put requests
router.put('/book/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isStudent), wrapAsync(middleware.memberOfCourse), wrapAsync(hw.bookTutor)); //Book a tutor
router.put('/leave/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isStudent), wrapAsync(middleware.memberOfCourse), wrapAsync(hw.leaveTutor)); //Leave Tutor
router.put('/upvote/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isStudent), wrapAsync(middleware.memberOfCourse), wrapAsync(hw.upvoteTutor)); //Upvote a tutor
router.put('/rate/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isStudent), wrapAsync(middleware.memberOfCourse), wrapAsync(hw.rateTutor)); //Submit a review for a tutor
router.put('/like-review/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isStudent), wrapAsync(hw.likeReview)); //Like a tutor's review

module.exports = router;