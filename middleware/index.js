// Executes before the code in route requests

const Room = require("../models/chat/room");
const Cafe = require('../models/cafe/cafe')
const Course = require('../models/homework/course')
const User = require("../models/user");
const AccessReq = require('../models/inbox/accessRequest');

//checks if user is logged in
module.exports.isLoggedIn = function(req, res, next) {
    if (req.isAuthenticated()) { return next();}
    req.flash('error', 'Please Login');
    return res.redirect('/');
}

//checks if user is allowed into room
module.exports.checkIfMember = async function(req, res, next) {
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
module.exports.checkForLeave = async function(req, res, next) {
    const room = await Room.findById(req.params.id);
    if (!room) {
        req.flash('error', 'Room cannot be found or does not exist');
        return res.redirect('/chat')
    }

    if (room.type != 'private') {
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
module.exports.checkRoomOwnership = async function(req, res, next) {
    const room = await Room.findById(req.params.id);
    if (!room) {
        req.flash('error', 'Room cannot be found or does not exist');
        return res.redirect('/chat')
    }

    if (room.creator.id.equals(req.user._id)) { return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('/chat/' + room._id);
}

module.exports.isPrincipal = function(req, res, next) {
    if (req.user.permission == 'principal') { return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('/');
}

module.exports.isAdmin = function(req, res, next) {
    if (req.user.permission == 'admin' || req.user.permission == 'principal') {
        return next();
    }
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('/');
}

module.exports.isMod = function(req, res, next) {
    if (req.user.permission == 'mod' || req.user.permission == 'admin' || req.user.permission == 'principal') {
        return next();
    }
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('/');
}

module.exports.isFaculty = function(req, res, next) {
    if (req.user.status == 'faculty') { return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

module.exports.isStudent = function(req, res, next) {
    if (['7th', '8th', '9th', '10th', '11th', '12th'].includes(req.user.status)) {
        return next();
    }
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

module.exports.isTutor = function(req, res, next) {
    if (req.user.tags.includes('Tutor')) { return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

module.exports.isCashier = function(req, res, next) {
    if (req.user.tags.includes('Cashier')) { return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

module.exports.isEditor = function(req, res, next) {
    if (req.user.tags.includes('Editor')) { return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

module.exports.cafeOpen = async function(req, res, next) { //Whether cafe is open to orders
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
module.exports.memberOfCourse = async function(req, res, next) {
    const course = await Course.findById(req.params.id);
    if (!course) {
        req.flash('error', 'Course not found');
        return res.redirect('/homework');
    }

    if (course.teacher.equals(req.user._id) || course.students.includes(req.user._id)) {
        return next();
    }

    for (let tutor of course.tutors) {
        if (tutor.tutor.equals(req.user._id)) {
            return next();
        }
    }

    req.flash('error', 'You are not a member of this course');
    return res.redirect('/homework');
}

//checks if user is not part of a course
module.exports.notMemberOfCourse = async function(req, res, next) {
    const course = await Course.findOne({joinCode: req.body.joincode});
    if (!course) {
        req.flash('error', 'Course not found');
        return res.redirect('/homework')
    }

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
