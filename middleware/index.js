// Executes before the code in route requests

const Platform = require("../models/platform");
const {ChatRoom, Market, Course} = require('../models/group');
const {objectArrIndex} = require("../utils/object-operations");
const setup = require("../utils/setup");

const middleware = {};

//checks if user is logged in
middleware.isLoggedIn = async function(req, res, next) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("/");
    }

    if (req.isAuthenticated()) {return next();}
    if (objectArrIndex(platform.publicFeatures, "route", req.baseUrl.slice(1)) > -1) { //If user is not logged in, but this feature is available to people without accounts
        if (platform.publicFeatures[objectArrIndex(platform.publicFeatures, "route", req.baseUrl.slice(1))].subroutes.includes(req.route.path)) {
            return next();
        }
    }
    req.flash('error', 'Please Login');
    return res.redirect('/');
}

//For platform's individual (private) features, that only certain platforms have access to
middleware.accessToFeature = async function(req, res, next) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }

    if (objectArrIndex(platform.features, "route", req.baseUrl.slice(1)) > -1 || objectArrIndex(platform.features, "route", `${req.baseUrl.slice(1)}${req.route.path}`) > -1) {
        return next();
    }
    req.flash('error', 'You do not have permission to view that');
    return res.redirect('back');
}

middleware.postPermission = async function(req, res, next) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "Unable to setup platform");
        return res.redirect("back");
    }
    if (platform.postVerifiable || platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission)) {
        return next();
    }
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

//checks if user is allowed into room
middleware.checkIfMember = async function(req, res, next) {
    const room = await ChatRoom.findById(req.params.id);
    if (!room) {
        req.flash('error', 'Room cannot be found or does not exist');
        return res.redirect('/chat')
    }

    if (!room.private || room.members.includes(req.user._id)) { return next();}
    req.flash('error', 'You are not a member of this room');
    return res.redirect('/chat');
}

// checks for if the user can leave from a room
middleware.checkForLeave = async function(req, res, next) {
    const room = await ChatRoom.findById(req.params.id);
    if (!room) {
        req.flash('error', 'Room cannot be found or does not exist');
        return res.redirect('/chat')
    }

    if (!room.private) {
        req.flash('error', 'You cannot leave a public room.');
        return res.redirect('back')
    }
    if (room.members.includes(req.user._id)) { return next();}

    req.flash('error', 'You are not a member of this room');
    return res.redirect('/chat');
}

// check if room owner
middleware.checkRoomOwnership = async function(req, res, next) {
    const room = await ChatRoom.findById(req.params.id);
    if (!room) {
        req.flash('error', 'Room cannot be found or does not exist');
        return res.redirect('/chat')
    }

    if (room.creator.equals(req.user._id)) { return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect(`/chat/${room._id}`);
}

middleware.isPrincipal = async function(req, res, next) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    if (req.user.permission == platform.permissionsProperty[platform.permissionsProperty.length-1]) { return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('/');
}

middleware.isAdmin = async function(req, res, next) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    if (platform.permissionsProperty.slice(platform.permissionsProperty.length-2).includes(req.user.permission)) { return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('/');
}

middleware.isMod = async function(req, res, next) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    if (platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission)) { return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('/');
}

middleware.isFaculty = async function(req, res, next) {
    const platform = await setup(Platform);
    if (req.user.status == platform.teacherStatus) { return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

middleware.isStudent = async function(req, res, next) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    if (platform.studentStatuses.includes(req.user.status)) { return next();}
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

//Whether shop is open to orders
middleware.shopOpen = async function(req, res, next) {
    const shop = await setup(Market);
    if (!shop) {
        req.flash('error', "An Error Occurred")
        return res.redirect('back')
    }

    if (shop.open) { return next();}
    req.flash('error', "The shop is currently not taking orders");
    return res.redirect('back');
}

middleware.platformPurchasable = async function(req, req, next) {
    const platform = await setup(Platform);
    if (platform.purchasable) { return next();}
    req.flash('error', `This feature is not enabled on ${platform.name} Saberchat`);
    return res.redirect('back');
}

//checks if user is part of a course
middleware.memberOfCourse = async function(req, res, next) {
    const course = await Course.findById(req.params.id);
    if (!course) {
        req.flash('error', 'Course not found');
        return res.redirect('/tutoringCenter');
    }

    if (course.creator.equals(req.user._id) || course.members.includes(req.user._id) || objectArrIndex(course.tutors, "tutor", req.user._id) > -1) {
        return next();
    }

    req.flash('error', 'You are not a member of this course');
    return res.redirect('/tutoringCenter');
}

//checks if user is not part of a course
middleware.notMemberOfCourse = async function(req, res, next) {
    const course = await Course.findOne({joinCode: req.body.joincode});
    if (!course) {
        req.flash('error', 'Course not found');
        return res.redirect('/tutoringCenter')
    }

    if (course.creator.equals(req.user._id) || course.members.includes(req.user._id) || objectArrIndex(course.tutors, "tutor", req.user._id) > -1) {
        req.flash('error', 'You are already a member of this course');
        return res.redirect('/tutoringCenter');
    }

    if (course.blocked.includes(req.user._id)) {
        req.flash('error', 'You are blocked from joining this course');
        return res.redirect('/tutoringCenter');
    }
    return next();
}

module.exports = middleware;