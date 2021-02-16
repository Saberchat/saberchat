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
router.get('/tutors/:id', middleware.isLoggedIn, middleware.memberOfCourse, wrapAsync(hwController.showTutor)); //RESTful routing "tutors/show" page

//Join/leave requests
router.post('/join', middleware.isLoggedIn, middleware.notMemberOfCourse, wrapAsync(hwController.joinCourse)) //Join course as tutor or student
router.post('/unenroll-student/:id', middleware.isLoggedIn, middleware.isStudent, middleware.memberOfCourse, wrapAsync(hwController.unenrollStudent)); //Leave course as a student
router.post('/unenroll-tutor/:id', middleware.isLoggedIn, middleware.isTutor, middleware.memberOfCourse, wrapAsync(hwController.unenrollTutor)); //Leave course as a tutor

//Teacher put requests
router.put('/updateTeacher/:id', middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, wrapAsync(hwController.updateTeacher)); //Update course teacher
router.put('/joinCode/:id', middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, wrapAsync(hwController.updateJoinCode)); //Update course join code
router.put('/remove-student/:id', middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, wrapAsync(hwController.removeStudent)); //For teachers to remove students from courses
router.put('/remove-tutor/:id', middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, wrapAsync(hwController.removeTutor)); //For teachers to remove tutors from courses
router.put('/unblock/:id', middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, wrapAsync(hwController.unblock)); //Unblock a blocked user

//Tutor put requests
router.put("/bio/:id", middleware.isLoggedIn, middleware.isTutor, wrapAsync(hwController.updateBio)); //Edit tutor bio
router.put('/close-lessons/:id', middleware.isLoggedIn, middleware.memberOfCourse, wrapAsync(hwController.closeLessons)); //For a tutor to make themself unavailable
router.put('/reopen-lessons/:id', middleware.isLoggedIn, middleware.memberOfCourse, wrapAsync(hwController.reopenLessons)); //For a tutor to make themself available to students
router.put('/set-students/:id', middleware.isTutor, middleware.memberOfCourse, wrapAsync(hwController.setStudents)); //For tutors to set student capacity
router.put("/mark/:id", middleware.isLoggedIn, middleware.isTutor, middleware.memberOfCourse, wrapAsync(hwController.markLesson)); //Mark a student's lesson

//Student put requests
router.put('/book/:id', middleware.isLoggedIn, middleware.isStudent, middleware.memberOfCourse, wrapAsync(hwController.bookTutor)); //Book a tutor
router.put('/leave/:id', middleware.isLoggedIn, middleware.isStudent, middleware.memberOfCourse, wrapAsync(hwController.leaveTutor)); //Leave Tutor
router.put('/upvote/:id', middleware.isLoggedIn, middleware.isStudent, middleware.memberOfCourse, wrapAsync(hwController.upvoteTutor)); //Upvote a tutor
router.put('/rate/:id', middleware.isLoggedIn, middleware.isStudent, middleware.memberOfCourse, wrapAsync(hwController.rateTutor)); //Submit a review for a tutor
router.put('/like-review/:id', middleware.isLoggedIn, middleware.isStudent, wrapAsync(hwController.likeReview)); //Like a tutor's review

module.exports = router;
