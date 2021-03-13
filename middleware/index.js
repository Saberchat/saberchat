// Executes before the code in route requests

const Room = require("../models/chat/room");
const Cafe = require('../models/cafe/cafe')
const Course = require('../models/homework/course')
const {objectArrIndex} = require("../utils/object-operations");
const platformSetup = require("../platform");

const middleware = {};

//checks if user is logged in
middleware.isLoggedIn = async function(req, res, next) {
    const platform = await platformSetup();
    if (req.isAuthenticated()) {return next();}
    //If user is not logged in, but this feature is available to people without accounts
    if (objectArrIndex(platform.publicFeatures, "route", req.baseUrl.slice(1)) > -1) {
        if (platform.publicFeatures[objectArrIndex(platform.publicFeatures, "route", req.baseUrl.slice(1))].subroutes.includes(req.route.path)) {
            return next();
        }
    }
    req.flash('error', 'Please Login');
    return res.redirect('/');
}

//checks if user is allowed into room
middleware.checkIfMember = async function(req, res, next) {
    const room = await Room.findById(req.params.id);
    if (!room) {
        req.flash('error', 'Room cannot be found or does not exist');
        return res.redirect('/chat')
    }

    if (room.type == 'public' || room.members.includes(req.user._id)) {
        return next();
    }
    req.flash('error', 'You are not a member of this room');
    return res.redirect('/chat');
}

// checks for if the user can leave from a room
middleware.checkForLeave = async function(req, res, next) {
    const room = await Room.findById(req.params.id);
    if (!room) {
        req.flash('error', 'Room cannot be found or does not exist');
        return res.redirect('/chat')
    }

    if (!room.private) {
        req.flash('error', 'You cannot leave a public room.');
        return res.redirect('back')
    }
    if (room.members.includes(req.user._id)) {
        return next();
    }

    req.flash('error', 'You are not a member of this room');
    return res.redirect('/chat');
}

// check if room owner
middleware.checkRoomOwnership = async function(req, res, next) {
    const room = await Room.findById(req.params.id);
    if (!room) {
        req.flash('error', 'Room cannot be found or does not exist');
        return res.redirect('/chat')
    }

    if (room.creator.equals(req.user._id)) { return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('/chat/' + room._id);
}

middleware.isPrincipal = function(req, res, next) {
    if (req.user.permission == 'principal') { return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('/');
}

middleware.isAdmin = function(req, res, next) {
    if (req.user.permission == 'admin' || req.user.permission == 'principal') {
        return next();
    }
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('/');
}

middleware.isMod = function(req, res, next) {
    if (req.user.permission == 'mod' || req.user.permission == 'admin' || req.user.permission == 'principal') {
        return next();
    }
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('/');
}

middleware.isFaculty = async function(req, res, next) {
    const platform = await platformSetup();
    if (req.user.status == platform.teacherStatus) { return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

middleware.isStudent = async function(req, res, next) {
    const platform = await platformSetup();
    if (platform.studentStatuses.includes(req.user.status)) {
        return next();
    }
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

middleware.isTutor = function(req, res, next) {
    if (req.user.tags.includes('Tutor')) { return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

middleware.isCashier = function(req, res, next) {
    if (req.user.tags.includes('Cashier')) { return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

middleware.isEditor = function(req, res, next) {
    if (req.user.tags.includes('Editor')) { return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

//Whether cafe is open to orders
middleware.cafeOpen = async function(req, res, next) {
    const cafe = await Cafe.findOne({});
    if (!cafe) {
        req.flash('error', "An Error Occurred")
        return res.redirect('back')
    }

    if (cafe.open) { return next();}
    req.flash('error', "The cafe is currently not taking orders");
    return res.redirect('back');
}

//checks if user is part of a course
middleware.memberOfCourse = async function(req, res, next) {
    const course = await Course.findById(req.params.id);
    if (!course) {
        req.flash('error', 'Course not found');
        return res.redirect('/homework');
    }

    if (course.teacher.equals(req.user._id) || course.students.includes(req.user._id) || objectArrIndex(course.tutors, "tutor", req.user._id) > -1) {
        return next();
    }

    req.flash('error', 'You are not a member of this course');
    return res.redirect('/homework');
}

//checks if user is not part of a course
middleware.notMemberOfCourse = async function(req, res, next) {
    const course = await Course.findOne({joinCode: req.body.joincode});
    if (!course) {
        req.flash('error', 'Course not found');
        return res.redirect('/homework')
    }

    if (course.teacher.equals(req.user._id) || course.students.includes(req.user._id) || objectArrIndex(course.tutors, "tutor", req.user._id) > -1) {
        req.flash('error', 'You are already a member of this course');
        return res.redirect('/homework');
    }

    if (course.blocked.includes(req.user._id)) {
        req.flash('error', 'You are blocked from joining this course');
        return res.redirect('/homework');
    }

    return next();
}

module.exports = middleware;