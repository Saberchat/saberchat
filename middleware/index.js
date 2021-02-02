// Executes before the code in HTTP route request

const Room = require("../models/room");
const Cafe = require('../models/cafe')
const Course = require('../models/course')
const user = require("../models/user");
const accessReq = require('../models/accessRequest');

//create a 'middleware' object to store middleware functions
middleware = {};

//create isLoggedIn function to check if user is logged in
middleware.isLoggedIn = ((req, res, next) => {
    //authenticate user
    if (req.isAuthenticated()) {
        //stop the function by returning and proceed to next step
        return next();
    }
    //user is not logged in. Give flash message and redirect to root
    req.flash('error', 'Please Login');
    res.redirect('/');
});

//checks if user is allowed into room
middleware.checkIfMember = ((req, res, next) => {
    Room.findById(req.params.id, (err, foundRoom) => {
        if (err || !foundRoom) {
            console.log(err);
            req.flash('error', 'Room cannot be found or does not exist');
            res.redirect('/chat')
        } else {
            if (foundRoom.type == 'public' || foundRoom.members.includes(req.user._id)) {
                return next();
            }
            // stuff for when user is not member of room
            req.flash('error', 'You are not a member of this room');
            res.redirect('/chat');
        }
    });
});

// checks for if the user can leave from a room
middleware.checkForLeave = ((req, res, next) => {
    Room.findById(req.params.id, (err, foundRoom) => {
        if (err || !foundRoom) {
            console.log(err);
            req.flash('error', 'Room cannot be found or does not exist');
            res.redirect('/chat')
        } else {
            if (foundRoom.type != 'private') {
                req.flash('error', 'You cannot leave a public room.');
                res.redirect('back')
            } else if (foundRoom.members.includes(req.user._id)) {
                next();
            } else {
                // stuff for when user is not member of room
                req.flash('error', 'You are not a member of this room');
                res.redirect('/chat');
            }
        }
    });
});

// check if room owner
middleware.checkRoomOwnership = ((req, res, next) => {
    Room.findById(req.params.id, (err, foundRoom) => {
        if (err || !foundRoom) {
            console.log(err);
            req.flash('error', 'Room cannot be found or does not exist');
            res.redirect('/chat')
        } else {
            if (foundRoom.creator.id.equals(req.user._id)) {
                return next();
            }
            req.flash('error', 'You do not have permission to do that');
            res.redirect('/chat/' + foundRoom._id);
        }
    });
});

middleware.isPrincipal = ((req, res, next) => {
    if (req.user.permission == 'principal') {
        next();
    } else {
        req.flash('error', 'You do not have permission to do that');
        res.redirect('/');
    }
});

middleware.isAdmin = ((req, res, next) => {
    if (req.user.permission == 'admin' || req.user.permission == 'principal') {
        next();
    } else {
        req.flash('error', 'You do not have permission to do that');
        res.redirect('/');
    }
});

middleware.isMod = ((req, res, next) => {
    if (req.user.permission == 'mod' || req.user.permission == 'admin' || req.user.permission == 'principal') {
        next();
    } else {
        req.flash('error', 'You do not have permission to do that');
        res.redirect('/');
    }
});

middleware.isFaculty = ((req, res, next) => {
    if (req.user.status == 'faculty') {
        next();
    } else {
        req.flash('error', 'You do not have permission to do that');
        res.redirect('back');
    }
});

middleware.isStudent = ((req, res, next) => {
    if (['7th', '8th', '9th', '10th', '11th', '12th'].includes(req.user.status)) {
        next();
    } else {
        req.flash('error', 'You do not have permission to do that');
        res.redirect('back');
    }
});

middleware.isTutor = ((req, res, next) => {
    if (req.user.tags.toString().toLowerCase().includes('tutor')) {
        next();
    } else {
        req.flash('error', 'You do not have permission to do that');
        res.redirect('back');
    }
});

middleware.isCashier = ((req, res, next) => {
    if (req.user.tags.toString().toLowerCase().includes('cashier')) {
        next();
    } else {
        req.flash('error', 'You do not have permission to do that');
        res.redirect('back');
    }
});

middleware.cafeOpen = ((req, res, next) => { //Cafe time restrictions

    Cafe.find({}, (err, foundCafe) => {
        if (err || !foundCafe) {
            req.flash('error', "Unable to access database")
            res.redirect('back')

        } else {
            if (foundCafe[0].open) {
                next();

            } else {
                req.flash('error', "The cafe is currently not taking orders");
                res.redirect('back');
            }
        }
    });
});

//checks if user is part of a course
middleware.memberOfCourse = ((req, res, next) => {
    Course.findById(req.params.id, (err, course) => {
        if (err || !course) {
            req.flash('error', 'Course not found');
            res.redirect('/homework');
        } else {
            if (course.teacher.equals(req.user._id) || course.students.includes(req.user._id)) {
                return next();
            }

            for (let tutor of course.tutors) {
                if (tutor.tutor.equals(req.user._id)) {
                    return next();
                }
            }

            req.flash('error', 'You are not a member of this course');
            res.redirect('/homework');
        }
    });
});

//checks if user is part of a course
middleware.notMemberOfCourse = ((req, res, next) => {
    Course.findOne({joinCode: req.body.joincode}, (err, course) => {
        if (err || !course) {
            req.flash('error', 'Course not found');
            res.redirect('/homework')
        } else {
            if (course.teacher.equals(req.user._id) || course.students.includes(req.user._id)) {
                req.flash('error', 'You are already a member of this course');
                return res.redirect('/homework');
            }

            if (course.blocked.includes(req.user._id)) {
                req.flash('error', 'You are blocked from joining this course');
                return res.redirect('/homework');
            }

            for (let tutor of course.tutors) {
                if (tutor.tutor.equals(req.user._id)) {
                    req.flash('error', 'You are already a member of this course');
                    return res.redirect('/homework');
                }
            }
            return next();
        }
    });
});

//export the object with all the functions
module.exports = middleware;
