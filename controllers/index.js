//LIBRARIES
const Filter = require('bad-words');
const filter = new Filter();
const passport = require('passport');
const {sendGridEmail} = require("../services/sendGrid");

//SCHEMA
const User = require('../models/user');
const Course = require('../models/homework/course');
const Email = require('../models/admin/email');
const Announcement = require('../models/announcements/announcement');

module.exports.index = function(req, res) {
    return res.render('index');
}

module.exports.register = async function(req, res) {
    const whitelistedEmail = await Email.findOne({address: req.body.email, version: "whitelist"});
    if (!whitelistedEmail && req.body.email.split("@")[1] != "alsionschool.org") {
        req.flash('error', 'Only members of the Alsion community may sign up');
        return res.redirect('/');
    }

    const overlap = await User.find({email: req.body.email});
    if (!overlap) {
        req.flash('error', "An error occurred");
        return res.redirect('/');
    }

    if (overlap.length > 0) {
        req.flash('error', "Email is already taken");
        return res.redirect('/');
    }

    let username = req.body.username;
    if (username[username.length - 1] == ' ') { //Space at the end of username causes errors that are hard to fix, and unnecessary if we nip it in the bud here
        username = username.slice(0, username.length - 1);
    }

    let firstName = req.body.firstName;
    if (firstName[firstName.length - 1] == ' ') { //Space at the end of username causes errors that are hard to fix, and unnecessary if we nip it in the bud here
        firstName = firstName.slice(0, firstName.length - 1);
    }

    let lastName = req.body.lastName;
    if (lastName[lastName.length - 1] == ' ') { //Space at the end of username causes errors that are hard to fix, and unnecessary if we nip it in the bud here
        lastName = lastName.slice(0, lastName.length - 1);
    }

    let email = req.body.email;
    if (email[email.length - 1] == ' ') { //Space at the end of username causes errors that are hard to fix, and unnecessary if we nip it in the bud here
        email = email.slice(0, email.length - 1);
    }

    //Create authentication token
    let charSetMatrix = [];
    charSetMatrix.push('qwertyuiopasdfghjklzxcvbnm'.split(''));
    charSetMatrix.push('QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
    charSetMatrix.push('1234567890'.split(''));

    let tokenLength = Math.round((Math.random() * 15)) + 15;
    let token = "";

    let charSet; //Which character set to choose from
    for (let i = 0; i < tokenLength; i += 1) {
        charSet = charSetMatrix[Math.floor(Math.random() * 3)];
        token += charSet[Math.floor((Math.random() * charSet.length))];
    }

    //creates new user from form info
    let newUser = new User(
        {
            email: email,
            firstName: firstName,
            lastName: lastName,
            username: filter.clean(username),
            msgCount: 0,
            annCount: [],
            reqCount: 0,
            authenticated: false,
            authenticationToken: token
        }
    );

    //Update annCount with all announcements
    const anns = await Announcement.find({});
    if (!anns) {
        req.flash('error', "Unable to find announcements");
        return res.redirect('back');
    }

    for (let ann of anns) {
        newUser.annCount.push({announcement: ann, version: "new"});
    }

    //registers the user
    const user = await User.register(newUser, req.body.password);
    if (!user) {
        req.flash("error", "An Error Occurred");
        return res.redirect("/");
    }
    await sendGridEmail(user.email, 'Verify Saberchat Account', `<p>Hello ${newUser.firstName},</p><p>Welcome to Saberchat! A confirmation of your account:</p><ul><li>Your username is ${newUser.username}.</li><li>Your full name is ${newUser.firstName} ${newUser.lastName}.</li><li>Your linked email is ${newUser.email}</li></ul><p>Click <a href="https://alsion-saberchat.herokuapp.com/authenticate/${newUser._id}?token=${token}">this link</a> to verify your account.</p>`, true);

    // if registration is successful, login user.
    req.flash("success", "Welcome to Saberchat " + user.firstName + "! Go to your email to verify your account");
    return res.redirect("/");
}

module.exports.authenticate = async function(req, res) {
    const user = await User.findById(req.params.id);
    if (!user) {
        req.flash('error', "Unable to find user");
        return res.redirect('/');
    }

    //Update authentication token
    let charSetMatrix = [];

    charSetMatrix.push('qwertyuiopasdfghjklzxcvbnm'.split(''));
    charSetMatrix.push('QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
    charSetMatrix.push('1234567890'.split(''));

    let tokenLength = Math.round((Math.random() * 15)) + 15;
    let token = "";

    let charSet; //Which character set to choose from

    for (let i = 0; i < tokenLength; i += 1) {
        charSet = charSetMatrix[Math.floor(Math.random() * 3)];
        token += charSet[Math.floor((Math.random() * charSet.length))];
    }

    if (req.query.token.toString() == user.authenticationToken.toString()) {
        user.authenticated = true;
        user.authenticationToken = token;
        await user.save();

        await req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
        });

        await sendGridEmail(user.email, 'Welcome To Saberchat!', `<p>Hello ${user.firstName},</p><p>Welcome to Saberchat! A confirmation of your account:</p><ul><li>Your username is ${user.username}.</li><li>Your full name is ${user.firstName} ${user.lastName}.</li><li>Your linked email is ${user.email}</li></ul><p>You will be assigned a role and status soon.</p>`, false);
        req.flash('success', 'Welcome ' + user.firstName);
        return res.redirect('/');
    }

    req.flash('error', "Invalid authentication token");
    return res.redirect('/');
}

module.exports.login = function(req, res, next) {
    //authenticate user
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }

        if (!user) {
            //flash message error
            req.flash('error', 'Invalid Email or Password');
            return res.redirect('/');
        }

        if (!user.authenticated) {
            req.flash('error', 'Go to your email to verify your account');
            return res.redirect('/');
        }

        //If authentication succeeds, log in user again
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            //flash message success
            req.flash('success', 'Welcome ' + user.firstName);
            return res.redirect('/');
        });
    })(req, res, next);
}

module.exports.forgotPassword = async function(req, res) {
    const users = await User.find({authenticated: true, 'email': req.body.newPwdEmail});
    if (!users) {
        req.flash('error', "Unable to find users");
        return res.redirect('/');
    }

    if (users.length == 0) {
        req.flash('error', "We couldn't find any users with that email address");
        return res.redirect('/');
    }

    let charSetMatrix = [];

    charSetMatrix.push('qwertyuiopasdfghjklzxcvbnm'.split(''));
    charSetMatrix.push('QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
    charSetMatrix.push('1234567890'.split(''));
    charSetMatrix.push('()%!~$#*-=+[)\\{]|\'",.<>');

    let pwd_length = Math.round((Math.random() * 15)) + 15;
    let pwd = "";

    let charSet; //Which character set to choose from
    for (let i = 0; i < pwd_length; i += 1) {
        charSet = charSetMatrix[Math.floor(Math.random() * 3)];
        pwd += charSet[Math.floor((Math.random() * charSet.length))];
    }

    for (let user of users) {
        user.tempPwd = pwd;
        await user.save();
    }

    await sendGridEmail(users[0].email, 'Saberchat Password Reset', `<p>Hello ${users[0].firstName},</p><p>You are receiving this email because you recently requested a password reset.</p><p>Click <a href="https://alsion-saberchat.herokuapp.com/reset-password?user=${users[0]._id}">here</a> to reset your password. Use the following character sequence as your temporary password:</p><p>${pwd}</p>`, true);
    req.flash('success', "Check your email for instructions on  how to reset your password");
    return res.redirect('/');
}

module.exports.resetPasswordForm = function(req, res) {
    return res.render('profile/reset-password', {user: req.query.user});
}

module.exports.resetPassword = async function(req, res) {
    if (req.body.newPwd == req.body.newPwdConfirm) {
        const user = await User.findById(req.query.user);
        if (!user) {
            req.flash('error', "Unable to find your profile");
            return res.redirect('/');
        }

        if (req.body.tempPwd == user.tempPwd) {
            await user.setPassword(req.body.newPwd);
            user.tempPwd = null;
            await user.save();

            await sendGridEmail(user.email, "Password Reset Confirmation", `<p>Hello ${user.firstName},</p><p>You are receiving this email because you recently reset your Saberchat password.</p><p>If you did not recently reset your password, contact a faculty member immediately.</p><p>If you did, you can ignore this message.</p>`, false);
            req.flash('success', "Password reset!");
            return res.redirect('/');
        }

        req.flash('error', "Your temporary password is incorrect. Make sure you are using the password that was sent to your email.");
        return res.redirect('back');
    }

    req.flash('error', "Passwords do not match");
    return res.redirect('back');
}

module.exports.logout = function(req, res) {
    req.logout(); //logout with passport
    req.flash("success", "Logged you out!"); //flash message success and redirect
    return res.redirect("/");
}

module.exports.contact = async function(req, res) {
    const faculty = await User.find({authenticated: true, authenticated: true, status: 'faculty'});
    if (!faculty) {
        req.flash('error', "An Error Occurred");
        return res.redirect('back');
    }

    return res.render('other/contact', {faculty});
}

module.exports.alsion = async function(req, res) {
    const faculty = await User.find({authenticated: true, status: 'faculty'});
    if (!faculty) {
        req.flash('error', "An Error Occurred");
        return res.redirect('back');
    }

    let teacherNames = [];
    for (let fac of faculty) {
        teacherNames.push(`${fac.firstName} ${fac.lastName}`);
    }
    return res.render('other/alsion_info', {faculty: teacherNames.join(', ')});
}

module.exports.darkmode = function(req, res) {
    if (req.user.darkmode) {
        req.user.darkmode = false;
    } else {
        req.user.darkmode = true;
    }

    req.user.save();
    return res.redirect('back');
}
