//Homework routes control the creation and management of courses, as well as tutors-student relations

const express = require('express');
const middleware = require('../middleware');
const {validateCourse} = require('../middleware/validation');
const {singleUpload} = require('../middleware/multer');
const wrapAsync = require('../utils/wrapAsync');
const tutoringCenter = require('../controllers/tutoringCenter'); //Controller
const router = express.Router(); //Router

//General routes
router.route('/')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(tutoringCenter.index)) //View index
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isFaculty), singleUpload, validateCourse, wrapAsync(tutoringCenter.createCourse)); //Create new course

//Course-specific routes
router.route('/:id')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.showCourse)) //View specific course
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isFaculty), wrapAsync(middleware.memberOfCourse), singleUpload, wrapAsync(tutoringCenter.updateSettings)) //Update specific course's settings
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isFaculty), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.deleteCourse)); //Delete course

//Show a specific tutor
router.get('/tutors/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.showTutor)); //RESTful routing "tutors/show" page

//Search Requests
router.post('/search-tutors', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isFaculty), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.searchTutors)); //Search for given tutor as faculty

//Join/leave requests
router.post('/join', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.notMemberOfCourse), wrapAsync(tutoringCenter.joinCourse)) //Join course as tutor or student
router.post('/unenroll-student/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isStudent), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.unenrollStudent)); //Leave course as a student
router.post('/unenroll-tutor/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isTutor, wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.unenrollTutor)); //Leave course as a tutor

//Teacher put requests
router.put('/updateTeacher/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isFaculty), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.updateTeacher)); //Update course teacher
router.put('/joinCode/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isFaculty), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.updateJoinCode)); //Update course join code
router.put('/remove-student/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isFaculty), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.removeStudent)); //For teachers to remove students from courses
router.put('/remove-tutor/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isFaculty), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.removeTutor)); //For teachers to remove tutors from courses
router.put('/unblock/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isFaculty), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.unblock)); //Unblock a blocked user

//Tutor put requests
router.put("/bio/:id", wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isTutor, wrapAsync(tutoringCenter.updateBio)); //Edit tutor bio
router.put('/close-lessons/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.closeLessons)); //For a tutor to make themself unavailable
router.put('/reopen-lessons/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.reopenLessons)); //For a tutor to make themself available to students
router.put('/set-cost/:id', middleware.isTutor, wrapAsync(middleware.accessToFeature), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.setCost)); //For tutors to update their costs
router.put('/set-students/:id', middleware.isTutor, wrapAsync(middleware.accessToFeature), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.setStudents)); //For tutors to set student capacity
router.put("/mark/:id", wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isTutor, wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.markLesson)); //Mark a student's lesson
router.put('/mark-payment/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), middleware.isTutor, wrapAsync(tutoringCenter.markPayment)); //Mark student's payment

//Student put requests
router.put('/book/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isStudent), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.bookTutor)); //Book a tutor
router.put('/leave/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isStudent), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.leaveTutor)); //Leave Tutor
router.put('/upvote/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isStudent), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.upvoteTutor)); //Upvote a tutor
router.put('/rate/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isStudent), wrapAsync(middleware.memberOfCourse), wrapAsync(tutoringCenter.rateTutor)); //Submit a review for a tutor
router.put('/like-review/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isStudent), wrapAsync(tutoringCenter.likeReview)); //Like a tutor's review
router.put('/approve-lesson/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(middleware.isStudent), wrapAsync(tutoringCenter.approveLesson)); //Approve Lesson

module.exports = router;