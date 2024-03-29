// Executes before route logic
// Checks for status, permissions, settings, etc. 

const Platform = require("../models/platform");
const {ChatRoom, Market, Course} = require('../models/group');
const {objectArrIndex} = require("../utils/object-operations");
const setup = require("../utils/setup");

const middleware = {}; // middleware object to be exported

//checks if user is logged in
middleware.isLoggedIn = async function(req, res, next) {
    const platform = await setup(Platform); // get platform settings
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("/");
    }

    if (req.isAuthenticated()) {return next();}
    if (objectArrIndex(platform.publicFeatures, "route", (await req.baseUrl.slice(1))) > -1) { //If user is not logged in, but this feature is available to people without accounts
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
    // check if platform has feature
    if (objectArrIndex(platform.features, "route", (await req.baseUrl.slice(1))) > -1 || objectArrIndex(platform.features, "route", `${req.baseUrl.slice(1)}${req.route.path}`) > -1) {
        return next();
    }
    req.flash('error', 'You do not have permission to view that');
    return res.redirect('back');
}

// check if user is allowed to create Posts
middleware.postPermission = async function(req, res, next) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "Unable to setup platform");
        return res.redirect("back");
    }
    if (platform.postVerifiable || req.user.status == platform.teacherStatus || (await platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission))) {
        return next();
    }
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

// check if user is allowed to create Announcements
middleware.announcementPermission = async function(req, res, next) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "Unable to setup platform");
        return res.redirect("back");
    }
    if (platform.postVerifiable || req.user.status == platform.teacherStatus || (await platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission))) {
        return next();
    }

    for (let perm of platform.announcementPerms) {
        if (req.user.tags.includes(perm)) return next();
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

    if (!room.private || (await room.members.includes(req.user._id))) {return next();}
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
    if (await room.members.includes(req.user._id)) {return next();}

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

    if (await room.creator.equals(req.user._id)) {return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect(`/chat/${room._id}`);
}

// check if user has principal level permissions
middleware.isPrincipal = async function(req, res, next) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    if (req.user.permission == platform.permissionsProperty[platform.permissionsProperty.length-1]) {return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('/');
}

// check if user has admin level privileges
middleware.isAdmin = async function(req, res, next) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    if ((await platform.permissionsProperty.slice(platform.permissionsProperty.length-2).includes(req.user.permission))) {return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('/');
}

// check if user has moderator level privileges
middleware.isMod = async function(req, res, next) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    if ((await platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission))) {return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('/');
}

// check if user is faculty
middleware.isFaculty = async function(req, res, next) {
    const platform = await setup(Platform);
    if (req.user.status == platform.teacherStatus) {return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

// check if user is student
middleware.isStudent = async function(req, res, next) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    if (await platform.studentStatuses.includes(req.user.status)) {return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

// check if user is tutor
middleware.isTutor = function(req, res, next) {
    if (req.user.tags.includes('Tutor')) {return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

// check if user has cashier access
middleware.isCashier = function(req, res, next) {
    if (req.user.tags.includes('Cashier')) {return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

// check if user has student council permissions
middleware.isStudentCouncil = async function(req, res, next) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }

    if ((await platform.permissionsProperty.slice(platform.permissionsProperty.length-2).includes(req.user.permission))) {
        return next();
    } else if (req.user.tags.includes("Student Council")) {
        return next();
    }
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('/');
}

// check if user has polls access
middleware.isPollster = function(req, res, next) {
    if (req.user.tags.includes('Pollster')) {return next();}
    req.flash('error', 'You do not have permission to do that');
    return res.redirect('back');
}

// check if user has editor access
middleware.isEditor = function(req, res, next) {
    if (req.user.tags.includes('Editor')) {return next();}
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

    if (shop.open) {return next();}
    req.flash('error', "The shop is currently not taking orders");
    return res.redirect('back');
}

// check if shop transactions are enabled
middleware.platformPurchasable = async function(req, res, next) {
    const platform = await setup(Platform);
    if (platform.purchasable) {return next();}
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

    if ((await course.creator.equals(req.user._id)) || (await course.members.includes(req.user._id)) || objectArrIndex(course.tutors, "tutor", req.user._id) > -1) {
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

    if ((await course.creator.equals(req.user._id)) || (await course.members.includes(req.user._id)) || objectArrIndex(course.tutors, "tutor", req.user._id) > -1) {
        req.flash('error', 'You are already a member of this course');
        return res.redirect('/tutoringCenter');
    }

    if (await course.blocked.includes(req.user._id)) {
        req.flash('error', 'You are blocked from joining this course');
        return res.redirect('/tutoringCenter');
    }
    return next();
}

module.exports = middleware; // export middleware object