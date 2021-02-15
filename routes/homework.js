//Homework routes control the creation and management of courses, as well as tutors-student relations

const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const {validateCourse} = require('../middleware/validation');
const {singleUpload} = require('../middleware/multer');
const wrapAsync = require('../utils/wrapAsync');
const hwController = require('../controllers/homework');

//General routes
router.route('/')
    .get(middleware.isLoggedIn, wrapAsync(hwController.index)) //View index
    .post(middleware.isLoggedIn, middleware.isFaculty, singleUpload, validateCourse, wrapAsync(hwController.createCourse)); //Create new course

//Course-specific routes
router.route('/:id')
    .get(middleware.isLoggedIn, middleware.memberOfCourse, wrapAsync(hwController.showCourse)) //View specific course
    .put(middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, singleUpload, wrapAsync(hwController.updateSettings)) //Update specific course's settings
    .delete(middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, wrapAsync(hwController.deleteCourse)); //Delete course

//Show a specific tutor
router.route('/tutors/:id')
    .get(middleware.isLoggedIn, middleware.memberOfCourse, wrapAsync(hwController.showTutor)); //RESTful routing "tutors/show" page

//Join/leave requests
router.route('/join')
    .post(middleware.isLoggedIn, middleware.notMemberOfCourse, wrapAsync(hwController.joinCourse)) //Join course as tutor or student

router.route('/unenroll-student/:id')
    .post(middleware.isLoggedIn, middleware.isStudent, middleware.memberOfCourse, wrapAsync(hwController.unenrollStudent)); //Leave course as a student

router.route('/unenroll-tutor/:id')
    .post(middleware.isLoggedIn, middleware.isTutor, middleware.memberOfCourse, wrapAsync(hwController.unenrollTutor)); //Leave course as a tutor

//Teacher put requests
router.route('/updateTeacher/:id')
    .put(middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, wrapAsync(hwController.updateTeacher)); //Update course teacher

router.route('/joinCode/:id')
    .put(middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, wrapAsync(hwController.updateJoinCode)); //Update course join code

router.route('/remove-student/:id')
    .put(middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, wrapAsync(hwController.removeStudent)); //For teachers to remove students from courses

router.route('/remove-tutor/:id')
    .put(middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, wrapAsync(hwController.removeTutor)); //For teachers to remove tutors from courses

router.route('/unblock/:id')
    .put(middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, wrapAsync(hwController.unblock)); //Unblock a blocked user

//Tutor put requests
router.route("/bio/:id")
    .put(middleware.isLoggedIn, middleware.isTutor, wrapAsync(hwController.updateBio)); //Edit tutor bio

router.route('/close-lessons/:id')
    .put(middleware.isLoggedIn, middleware.memberOfCourse, wrapAsync(hwController.closeLessons)); //For a tutor to make themself unavailable

router.route('/reopen-lessons/:id')
    .put(middleware.isLoggedIn, middleware.memberOfCourse, wrapAsync(hwController.reopenLessons)); //For a tutor to make themself available to students

router.route('/set-students/:id')
    .put(middleware.isTutor, middleware.memberOfCourse, wrapAsync(hwController.setStudents)); //For tutors to set student capacity

router.route("/mark/:id")
    .put(middleware.isLoggedIn, middleware.isTutor, middleware.memberOfCourse, wrapAsync(hwController.markLesson)); //Mark a student's lesson

//Student put requests
router.route('/book/:id')
    .put(middleware.isLoggedIn, middleware.isStudent, middleware.memberOfCourse, wrapAsync(hwController.bookTutor)); //Book a tutor

router.route('/leave/:id')
    .put(middleware.isLoggedIn, middleware.isStudent, middleware.memberOfCourse, wrapAsync(hwController.leaveTutor)); //Leave Tutor

router.route('/upvote/:id')
    .put(middleware.isLoggedIn, middleware.isStudent, middleware.memberOfCourse, wrapAsync(hwController.upvoteTutor)); //Upvote a tutor

router.route('/rate/:id')
    .put(middleware.isLoggedIn, middleware.isStudent, middleware.memberOfCourse, wrapAsync(hwController.rateTutor)); //Submit a review for a tutor

router.route('/like-review/:id')
    .put(middleware.isLoggedIn, middleware.isStudent, wrapAsync(hwController.likeReview)); //Like a tutor's review

module.exports = router;
