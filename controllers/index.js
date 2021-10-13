//LIBRARIES
const Filter = require('bad-words');
const filter = new Filter();
const passport = require('passport');
const {sendGridEmail} = require("../services/sendGrid");
const setup = require("../utils/setup");
const {convertToLink} = require("../utils/convert-to-link");
const {objectArrIndex} = require("../utils/object-operations");

//SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const Email = require('../models/admin/email');
const {Announcement, Project, WHArticle} = require('../models/post');
const Order = require('../models/shop/order');

const controller = {};

controller.homepage = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash('error', "An Error Occurred");
        return res.redirect('back');
    }
    // Search for all posts
    const announcements = await Announcement.find({}).populate('sender');
    const projects = await Project.find({verified: true}).populate('creators').populate('sender');
    const articles = await WHArticle.find({}).populate('authors');

    if (platform.indexPlatformInfo) {
        return res.render('other/platform-info', {platform, objectArrIndex, description: (req.user != undefined && req.query.description != undefined)});
    }
    return res.render('homepage', {platform, announcements, projects, articles});
}

controller.index = async function(req, res) {
    const platform = await setup(Platform);
    const teachers = await User.find({authenticated: true, status: platform.teacherStatus});
    if (!platform || !teachers) {
        await req.flash('error', "An Error Occurred");
        return res.redirect('back');
    }

    let names = [];
    for (let user of teachers) {await names.push(`${user.firstName} ${user.lastName}`);} //Iterate through faculty and add their name to array

    if (platform.indexPlatformInfo) {
        return res.render('other/platform-info', {platform, names: await names.join(', '), objectArrIndex, description: (req.user != undefined && req.query.description != undefined)});
    }
    return res.render('index', {platform});
}

controller.info = async function(req, res) {
    const platform = await setup(Platform);
    const teachers = await User.find({authenticated: true, status: platform.teacherStatus});
    if (!platform || !teachers) {
        await req.flash('error', "An Error Occurred");
        return res.redirect('back');
    }

    let names = [];
    for (let user of teachers) {await names.push(`${user.firstName} ${user.lastName}`);} //Iterate through faculty and add their name to array

    if (platform.indexPlatformInfo) {return res.render('index', {platform});}
    return res.render('other/platform-info', {platform, names: await names.join(', '), objectArrIndex, description: (req.user != undefined && req.query.description != undefined)});
}

controller.register = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An error occurred");
        return res.redirect("back");
    }

    const accesslistedEmail = await Email.findOne({address: req.body.email, version: "accesslist"});
    const blocklistedEmail = await Email.findOne({address: req.body.email, version: "blockedlist"});
    if (!accesslistedEmail) { //Check if principal has to authenticate email, or if user has to have their account authenticated first
        if (!platform.principalAuthenticate && platform.emailExtension != '' && (await req.body.email.split("@")[1] != platform.emailExtension)) {
            await req.flash('error', `Only members of the ${platform.name} community may sign up. Contact a platform ${platform.permissionsDisplay[platform.permissionsDisplay.length-1]} to verify your email.`);
            return res.redirect('/');
        } else if (blocklistedEmail) {
            await req.flash('error', `Only members of the ${platform.name} community may sign up.`);
            return res.redirect('/');
        }
    }

    const overlap = await User.find({email: req.body.email});
    if (!overlap) {
        await req.flash('error', "An error occurred");
        return res.redirect('/');
    }

    if (overlap.length > 0) {
        await req.flash('error', "Email is already taken");
        return res.redirect('/');
    }

    let username = req.body.username;
    if (username[username.length - 1] == ' ') { //Space at the end of username causes errors that are hard to fix, and unnecessary if we nip it in the bud here
        username = await username.slice(0, username.length - 1);
    }

    let firstName = req.body.firstName;
    if (firstName[firstName.length - 1] == ' ') { //Space at the end of username causes errors that are hard to fix, and unnecessary if we nip it in the bud here
        firstName = await firstName.slice(0, firstName.length - 1);
    }

    let lastName = req.body.lastName;
    if (lastName[lastName.length - 1] == ' ') { //Space at the end of username causes errors that are hard to fix, and unnecessary if we nip it in the bud here
        lastName = await lastName.slice(0, lastName.length - 1);
    }

    let email = req.body.email;
    if (email[email.length - 1] == ' ') { //Space at the end of username causes errors that are hard to fix, and unnecessary if we nip it in the bud here
        email = await email.slice(0, email.length - 1);
    }

    //Create authentication token
    let charSetMatrix = [];
    await charSetMatrix.push(await 'qwertyuiopasdfghjklzxcvbnm'.split(''));
    await charSetMatrix.push(await 'QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
    await charSetMatrix.push(await '1234567890'.split(''));

    let tokenLength = Math.round((Math.random() * 15)) + 15;
    let token = "";

    let charSet; //Which character set to choose from
    for (let i = 0; i < tokenLength; i += 1) {
        charSet = charSetMatrix[Math.floor(Math.random() * 3)];
        token += charSet[Math.floor((Math.random() * charSet.length))];
    }

    //creates new user from form info
    let newUser = new User({
        email: email,
        firstName: firstName,
        lastName: lastName,
        username: await filter.clean(username),
        annCount: [],
        authenticated: false,
        authenticationToken: token,
        bannerUrl: {url: platform.imageUrl, display: true}
    });

    //Update annCount with all announcements
    const anns = await Announcement.find({});
    if (!anns) {
        await req.flash('error', "Unable to find announcements");
        return res.redirect('back');
    }
    for (let ann of anns) await newUser.annCount.push({announcement: ann, version: "new"});

    //registers the user
    const user = await User.register(newUser, req.body.password);
    if (!user) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("/");
    }

    if ((await `${user.firstName} ${user.lastName}`.toLowerCase()) == (await platform.principal.toLowerCase())) {
        user.permission = platform.permissionsProperty[platform.permissionsProperty.length-1];
        await user.save();
    }

    //If principal does not have to authenticate user, user authenticates themself with email
    if (!platform.principalAuthenticate || accesslistedEmail || (platform.emailExtension != '' && (await req.body.email.split("@")[1] == platform.emailExtension))) {
        await sendGridEmail(user.email, 'Verify Saberchat Account', `<p>Hello ${newUser.firstName},</p><p>Welcome to Saberchat! A confirmation of your account:</p><ul><li>Your username is ${newUser.username}.</li><li>Your full name is ${newUser.firstName} ${newUser.lastName}.</li><li>Your linked email is ${newUser.email}</li></ul><p>Click <a href="https://${platform.url}/authenticate/${newUser._id}?token=${token}">this link</a> to verify your account.</p>`, true);
    }

    // if registration is successful, login user.
    if (!platform.principalAuthenticate || accesslistedEmail || (platform.emailExtension != '' && (await req.body.email.split("@")[1] == platform.emailExtension))) {
        await req.flash("success", `Welcome to Saberchat ${user.firstName}! Go to your email to verify your account.`);
    } else {
        await req.flash("success", `Welcome to Saberchat ${user.firstName}! Your account will be evaluated and authenticated soon`);
    }
    return res.redirect("/");
}

controller.authenticate = async function(req, res) {
    const user = await User.findById(req.params.id);
    if (!user) {
        await req.flash('error', "Unable to find user");
        return res.redirect('/');
    }

    //Update authentication token
    let charSetMatrix = [];
    await charSetMatrix.push(await 'qwertyuiopasdfghjklzxcvbnm'.split(''));
    await charSetMatrix.push(await 'QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
    await charSetMatrix.push(await '1234567890'.split(''));

    let tokenLength = Math.round((Math.random() * 15)) + 15;
    let token = "";
    let charSet; //Which character set to choose from
    for (let i = 0; i < tokenLength; i += 1) {
        charSet = charSetMatrix[Math.floor(Math.random() * 3)];
        token += charSet[Math.floor((Math.random() * charSet.length))];
    }

    //If authentication token is a match
    if ((await req.query.token.toString()) == (await user.authenticationToken.toString())) {
        user.authenticated = true;
        user.authenticationToken = token;
        await user.save();

        await req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
        });

        await sendGridEmail(user.email, 'Welcome To Saberchat!', `<p>Hello ${user.firstName},</p><p>Welcome to Saberchat! A confirmation of your account:</p><ul><li>Your username is ${user.username}.</li><li>Your full name is ${user.firstName} ${user.lastName}.</li><li>Your linked email is ${user.email}</li></ul><p>You will be assigned a role and status soon.</p>`, false);
        await req.flash('success', `Welcome ${user.firstName}`);
        return res.redirect('/');
    }

    await req.flash('error', "Invalid authentication token");
    return res.redirect('/');
}

controller.login = function(req, res, next) { //No need for async as login record can be saved after page reloads
    passport.authenticate('local', (err, user, info) => { //authenticate user with passport
        if (err) { //If an error occurs
            return next(err);
        }

        if (!user) { //If user does not exist
            req.flash('error', 'Invalid Email or Password');
            return res.redirect('/');
        }

        if (!user.authenticated) { //If user is not email authenticated
            req.flash('error', 'Go to your email to verify your account');
            return res.redirect('/');
        }

        //If authentication succeeds, log in user again
        req.logIn(user, (err) => {
            if (err) {return next(err);}
            user.logins.push(new Date());
            user.save();
            req.flash('success', `Welcome ${user.firstName}`);
            return res.redirect('/');
        });
    })(req, res, next);
}

controller.forgotPassword = async function(req, res) {
    const platform = await setup(Platform);
    const user = await User.findOne({authenticated: true, email: req.body.newPwdEmail});
    if (!platform || !user) {
        await req.flash('error', "We couldn't find any users with that email address");
        return res.redirect('/');
    }

    //Build temporary password for user to confirm their identity
    let charSetMatrix = [];
    await charSetMatrix.push(await 'qwertyuiopasdfghjklzxcvbnm'.split(''));
    await charSetMatrix.push(await 'QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
    await charSetMatrix.push(await '1234567890'.split(''));
    await charSetMatrix.push(await '()%!~$#*-=+[)\\{]|\'",.<>'.split(''));

    let pwd_length = Math.round((Math.random() * 15)) + 15;
    let pwd = "";

    let charSet; //Which character set to choose from
    for (let i = 0; i < pwd_length; i += 1) {
        charSet = charSetMatrix[Math.floor(Math.random() * 3)];
        pwd += charSet[Math.floor((Math.random() * charSet.length))];
    }

    user.tempPwd = pwd;
    await user.save();
    //Email with password reset instructions
    await sendGridEmail(user.email, 'Saberchat Password Reset', `<p>Hello ${user.firstName},</p><p>You are receiving this email because you recently requested a password reset.</p><p>Click <a href="https://${platform.url}/reset-password?user=${user._id}">here</a> to reset your password. Use the following character sequence as your temporary password:</p><p>${pwd}</p>`, true);
    await req.flash('success', "Check your email for instructions on  how to reset your password");
    return res.redirect('/');
}

controller.resetPasswordForm = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }
    return res.render('profiles/reset-password', {platform, user: req.query.user});
}

controller.resetPassword = async function(req, res) {
    if (req.body.newPwd == req.body.newPwdConfirm) {
        const user = await User.findById(req.query.user);
        if (!user) {
            await req.flash('error', "Unable to find your profile");
            return res.redirect('/');
        }

        if (req.body.tempPwd == user.tempPwd) { //Update password is temporary passwords match
            await user.setPassword(req.body.newPwd);
            user.tempPwd = null;
            await user.save();

            //Confirmation email
            await sendGridEmail(user.email, "Password Reset Confirmation", `<p>Hello ${user.firstName},</p><p>You are receiving this email because you recently reset your Saberchat password.</p><p>If you did not recently reset your password, contact a faculty member immediately.</p><p>If you did, you can ignore this message.</p>`, false);
            await req.flash('success', "Password reset!");
            return res.redirect('/');
        }

        await req.flash('error', "Your temporary password is incorrect. Make sure you are using the password that was sent to your email.");
        return res.redirect('back');
    }

    await req.flash('error', "Passwords do not match");
    return res.redirect('back');
}

controller.logout = function(req, res) {
    req.logout(); //logout with passport
    req.flash("success", "Logged you out!"); //flash message success and redirect
    return res.redirect("/");
}

controller.contact = async function(req, res) { //Contact info of highest status and developers
    const platform = await setup(Platform);
    //Get users with the highest status (e.g. faculty)
    const teachers = await User.find({authenticated: true, authenticated: true, status: platform.teacherStatus});
    if (!platform || !teachers) {
        await req.flash('error', "An Error Occurred");
        return res.redirect('back');
    }

    const highestPermission = platform.permissionsProperty[platform.permissionsProperty.length-1]; //Get highest permission (e.g. principal)
    return res.render('other/contact', {platform, teachers, highestPermission, convertToLink});
}

controller.darkmode = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }

    if (platform.enableDarkmode) { req.user.darkmode = !req.user.darkmode;}
    await req.user.save();
    return res.redirect('back');
}

controller.ecdocs = async function(req, res) {
    const platform = await setup(Platform);
    if (objectArrIndex(platform.features, "route", "/ecdocs") > -1) { //Alsion-native platform
        return res.render("other/ecdocs", {platform});
    }
    return res.redirect("/");
}

module.exports = controller;
