const Comment = require('../models/comment');
const User = require("../models/user");
const Email = require("../models/email");

module.exports.index = async function(req, res) {
    return res.render("admin/index");
}

module.exports.moderateGet = async function(req, res) {
    Comment.find({status: 'flagged'})
        .populate({path: 'author', select: ['username', 'imageUrl']})
        .populate({path: 'statusBy', select: ['username', 'imageUrl']})
        .populate({path: 'room', select: ['name']})
        .exec((err, comments) => {
            if (err) {
                req.flash('error', 'Cannot access DataBase');
                return res.redirect('/admin');

            } else {
                return res.render('admin/mod', {comments});
            }
        });
}

module.exports.moderatePost = async function(req, res) {
    const reportedComment = await Comment.findById(req.body.commentId).populate("author");
    if (!reportedComment) {
        return res.json({error: "Unable to find comment"});
    }

    let commentIndex;
    let context = [];

    const allComments = await Comment.find({room: reportedComment.room}).populate("author");
    if (!allComments) {
        return res.json({error: "Unable to find other comments"});
    }

    for (let i = 0; i < allComments.length; i++) {
        if (allComments[i]._id.equals(reportedComment._id)) {
            commentIndex = i;
            break;
        }
    }

    for (let i = 5; i >= 1; i--) {
        if (commentIndex - i > 0) {
            if (allComments[commentIndex - i].author) {
                context.push(allComments[commentIndex - i]);
            }
        }
    }

    context.push(reportedComment);

    for (let i = 1; i <= 5; i++) {
        if (commentIndex + i < allComments.length) {
            if (allComments[commentIndex + i].author) {
                context.push(allComments[commentIndex + i]);
            }
        }
    }

    return res.json({success: "Succesfully collected data", context});
}

module.exports.moderatePut = async function(req, res) {
    Comment.findById(req.body.id).populate('statusBy').exec((err, comment) => {
        if (err || !comment) {
            return res.json({error: 'Could not find comment'});

        } else if (comment.author.equals(req.user._id)) {
            return res.json({error: "You cannot handle your own comments"});

        } else if (comment.statusBy._id.equals(req.user._id)) {
            return res.json({error: "You cannot handle comments you have reported"});

        } else {
            comment.status = "ignored";
            comment.save();
            comment.statusBy.falseReportCount += 1;
            comment.statusBy.save();

            return res.json({success: 'Ignored comment'});
        }
    });
}

module.exports.moderateDelete = async function(req, res) {
    Comment.findById(req.body.id).populate("author").exec((err, comment) => {
        if (err || !comment) {
            return res.json({error: 'Could not find comment'});

        } else if (comment.author.equals(req.user._id)) {
            return res.json({error: "You cannot handle your own comments"});

        } else if (comment.statusBy._id.equals(req.user._id)) {
            return res.json({error: "You cannot handle comments you have reported"});

        } else {
            comment.status = "deleted";
            comment.save();
            comment.author.reportedCount += 1;
            comment.author.save();
            return res.json({success: 'Deleted comment'});
        }
    });
}

module.exports.permissionsGet = async function(req, res) {
    User.find({authenticated: true}, (err, foundUsers) => {
        if (err || !foundUsers) {
            req.flash('error', 'Cannot access Database');
            return res.redirect('/admin');

        } else {
            return res.render('admin/permission', {users: foundUsers});
        }
    });
}

module.exports.statusGet = async function(req, res) {
    User.find({authenticated: true}, (err, foundUsers) => {
        if (err || !foundUsers) {
            req.flash('error', 'Cannot access Database');
            return res.redirect('/admin');
        } else {
            return res.render('admin/status', {users: foundUsers, tags: ['Cashier', 'Tutor', 'Editor']});
        }
    });
}

module.exports.statusPut = async function(req, res) {
    const user = await User.findById(req.body.user);

    if (!user) {
        return res.json({error: 'Error. Could not change'});
    }

    if (user.status == "faculty") {
        let teaching = false;

        const courses = await Course.find({});
        if (!courses) {
            return res.json({error: "Error. Could not change", user});
        }

        for (let course of courses) {
            if (course.teacher.equals(user._id)) {
                teaching = true;
                break;
            }
        }

        if (teaching) {
            return res.json({error: "User is an active teacher", user});
        }

        user.status = req.body.status;
        await user.save();
        return res.json({success: "Succesfully changed", user});
    }

    user.status = req.body.status;
    await user.save();
    return res.json({success: "Successfully Changed", user});
}

module.exports.whitelistGet = async function(req, res) {
    let emails;

    if (req.query.version) {
        if (["whitelist", "blacklist"].includes(req.query.version)) {
            emails = await Email.find({name: {$ne: req.user.email}, version: req.query.version});
        } else {
            emails = await Email.find({name: {$ne: req.user.email}, version: "whitelist"});
        }
    } else {
        emails = await Email.find({name: {$ne: req.user.email}, version: "whitelist"});
    }

    if (!emails) {
        req.flash('error', "Unable to find emails");
        return res.redirect('back');
    }

    const users = await User.find({authenticated: true});
    if (!users) {
        req.flash('error', "Unable to find users");
        return res.redirect('back');
    }

    if (req.query.version) {
        if (["whitelist", "blacklist"].includes(req.query.version)) {
            return res.render('admin/whitelist', {emails, users, version: req.query.version});
        }
    }

    return res.render('admin/whitelist', {emails, users, version: "whitelist"});
}

module.exports.whitelistPut = async function (req, res) {
    if (req.body.version === "whitelist" && req.body.address.split('@')[1] === "alsionschool.org") {
        return res.json({error: "Alsion emails do not need to be added to the whitelist"});
    }

    const overlap = await Email.findOne({address: req.body.address});
    if (overlap) { //If any emails overlap, don't create the new email
        return res.json({error: "Email is already either in whitelist or blacklist"});
    }

    const email = await Email.create({address: req.body.address, version: req.body.version});
    if (!email) {
        return res.json({error: "Error creating email"});
    }

    return res.json({success: "Email added", email});
}

module.exports.whitelistId = async function (req, res) {
    const email = await Email.findById(req.body.email);
    if (!email) {
        return res.json({error: "Unable to find email"});
    }

    const users = await User.find({authenticated: true, email: email.address});
    if (!users) {
        return res.json({error: "Unable to find users"});
    }

    if (users.length === 0) {
        const deletedEmail = await Email.findByIdAndDelete(email._id);
        if (!deletedEmail) {
            return res.json({error: "Unable to delete email"});
        }

        return res.json({success: "Deleted email"});
    }

    return res.json({error: "Active user has this email"});
}

module.exports.permissionsPut = async function (req, res) {
    User.findById(req.body.user, (err, user) => {
        if (err || !user) {
            return res.json({error: "Error. Could not change"});

        } else if (req.body.role == 'admin' || req.body.role == "principal") { //Changing a user to administrator or principal requires specific permissions

            if (req.user.permission == 'principal') { // check if current user is the principal
                user.permission = req.body.role;
                user.save();
                return res.json({success: "Succesfully changed", user});

            } else {
                return res.json({error: "You do not have permissions to do that", user});
            }

        } else {
            if ((user.permission == "principal" || user.permission == "admin") && req.user.permission != "principal") {
                return res.json({error: "You do not have permissions to do that", user});

            } else {
                user.permission = req.body.role;
                user.save();
                return res.json({success: 'Succesfully changed', user});
            }
        }
    });
}

module.exports.tag = async function(req, res) {
    const user = await User.findById(req.body.user);

    if (!user) {
        return res.json({error: 'Error. Could not change'});
    }

    if (user.tags.includes(req.body.tag)) {

        if (req.body.tag == "Tutor") {
            const courses = await Course.find({});

            if (!courses) {
                return res.json({error: 'Error. Could not change'});
            }

            let active = false;

            loop1:
                for (let course of courses) {
                    loop2:
                        for (let tutor of course.tutors) {
                            if (tutor.tutor.equals(user._id)) {
                                active = true;
                                break loop1;
                            }
                        }
                }

            if (active) {
                return res.json({error: "User is an Active Tutor"});

            } else {
                user.tags.splice(user.tags.indexOf(req.body.tag), 1);
                user.save();
                return res.json({success: "Successfully removed status", tag: req.body.tag})
            }

        } else {
            user.tags.splice(user.tags.indexOf(req.body.tag), 1);
            user.save();
            return res.json({success: "Successfully removed status", tag: req.body.tag})
        }

    } else {
        user.tags.push(req.body.tag);
        user.save();
        return res.json({success: "Successfully added status", tag: req.body.tag})
    }
}

module.exports.manageCafe = async function(req, res) {
    return res.redirect('/cafe/manage');
}
