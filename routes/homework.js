//Homework routes control the creation and management of courses, as well as tutors-student relations

const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const {validateCourse} = require('../middleware/validation');
const homeworkController = require('../controllers/homework');

//General routes
router.route('/')
    .get(middleware.isLoggedIn, homeworkController.index) //View index
    .post(middleware.isLoggedIn, middleware.isFaculty, validateCourse, homeworkController.createCourse); //Create new course

//Course-specific routes
router.route('/:id')
    .get(middleware.isLoggedIn, middleware.memberOfCourse, homeworkController.showCourse) //View specific course
    .put(middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, homeworkController.updateSettings) //Update specific course's settings
    .delete(middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, homeworkController.deleteCourse); //Delete course

//Show a specific tutor
router.get('/tutors/:id', middleware.isLoggedIn, middleware.memberOfCourse, homeworkController.showTutor); //RESTful routing "tutors/show" page

//Join/leave requests
router.post('/join', middleware.isLoggedIn, middleware.notMemberOfCourse, homeworkController.joinCourse); //Join course as tutor or student
router.post('/unenroll-student/:id', middleware.isLoggedIn, middleware.isStudent, middleware.memberOfCourse, homeworkController.unenrollStudent); //Leave course as a student
router.post('/unenroll-tutor/:id', middleware.isLoggedIn, middleware.isTutor, middleware.memberOfCourse, homeworkController.unenrollTutor); //Leave course as a tutor

//Teacher put requests
router.put('/updateTeacher/:id', middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, homeworkController.updateTeacher); //Update course teacher
router.put('/joinCode/:id', middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, homeworkController.updateJoinCode); //Update course join code
router.put('/remove-student/:id', middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, homeworkController.removeStudent); //For teachers to remove students from courses
router.put('/remove-tutor/:id', middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, homeworkController.removeTutor); //For teachers to remove tutors from courses
router.put('/unblock/:id', middleware.isLoggedIn, middleware.isFaculty, middleware.memberOfCourse, homeworkController.unblock); //Unblock a blocked user

//Tutor put requests
router.put("/bio/:id", middleware.isLoggedIn, middleware.isTutor, homeworkController.updateBio); //Edit tutor bio
router.put('/close-lessons/:id', middleware.isLoggedIn, middleware.memberOfCourse, homeworkController.closeLessons); //For a tutor to make themself unavailable
router.put('/reopen-lessons/:id', middleware.isLoggedIn, middleware.memberOfCourse, homeworkController.reopenLessons); //For a tutor to make themself available to students
router.put('/set-students/:id', middleware.isTutor, middleware.memberOfCourse, homeworkController.setStudents); //For tutors to set student capacity
router.put("/mark/:id", middleware.isLoggedIn, middleware.isTutor, middleware.memberOfCourse, homeworkController.markLesson); //Mark a student's lesson

//Student put requests
router.put('/book/:id', middleware.isLoggedIn, middleware.isStudent, middleware.memberOfCourse, homeworkController.bookTutor); //Book a tutor
router.put('/leave/:id', middleware.isLoggedIn, middleware.isStudent, middleware.memberOfCourse, homeworkController.leaveTutor); //Leave Tutor
router.put('/upvote/:id', middleware.isLoggedIn, middleware.isStudent, middleware.memberOfCourse, homeworkController.upvoteTutor); //Upvote a tutor
router.put('/rate/:id', middleware.isLoggedIn, middleware.isStudent, middleware.memberOfCourse, homeworkController.rateTutor); //Submit a review for a tutor
router.put('/like-review/:id', middleware.isLoggedIn, middleware.isStudent, homeworkController.likeReview); //Like a tutor's review

module.exports = router;
