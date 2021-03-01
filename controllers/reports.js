const {convertToLink} = require("../utils/convert-to-link");
const dateFormat = require('dateformat');

//SCHEMA
const User = require('../models/user');
const PostComment = require('../models/postComment');

const controller = {};

// Report GET index
controller.index = async function(req, res) {
    const reports = await PostComment.find({type: "report"}).populate('sender').exec();
    if(!reports) {req.flash('error', 'Cannot find reports.'); return res.redirect('back');}
    return res.render('reports/index', {reports: reports.reverse()});
};

// Report GET new report
controller.new = function(req, res) {
    return res.render('reports/new');
};

// Report GET show
controller.show = async function(req, res) {
    const report = await PostComment.findById(req.params.id)
        .populate('sender')
        .populate({
            path: "comments",
            populate: {
                path: "sender"
            }
        }).exec();
    if(!report) {req.flash('error', 'Could not find report'); return res.redirect('back');}

    const convertedText = convertToLink(report.text);
    return res.render('reports/show', {report: report, convertedText});
};

// Report GET edit form
controller.updateForm = async function(req, res) {
    const report = await PostComment.findById(req.params.id);
    if(!report) {req.flash('error', 'Could not find report'); return res.redirect('back');}
    if(!report.sender._id.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that.');
        return res.redirect('back');
    }
    return res.render('reports/edit', {report});
};

// Report POST create
controller.create = async function(req, res) {
    const report = await PostComment.create({
        type: "report",
        sender: req.user,
        subject: req.body.subject,
        text: req.body.message
    });
    if (!report) {
        req.flash('error', 'Unable to create report');
        return res.redirect('back');
    }
    report.date = dateFormat(report.created_at, "h:MM TT | mmm d");
    await report.save();

    req.flash('success', 'Report Posted to Bulletin!');
    return res.redirect(`/reports/${report._id}`);
};

controller.updateReport = async function(req, res) {
    const report = await PostComment.findById(req.params.id).populate('sender');
    if (!report) {
        req.flash('error', "Unable to access report");
        return res.redirect('back');
    }

    if (report.sender._id.toString() != req.user._id.toString()) {
        req.flash('error', "You can only update reports which you have sent");
        return res.redirect('back');
    }

    const updatedReport = await PostComment.findByIdAndUpdate(req.params.id, {
        subject: req.body.subject,
        text: req.body.message
    });
    if (!updatedReport) {
        req.flash('error', "Unable to update report");
        return res.redirect('back');
    }

    await updatedReport.save();
    const users = await User.find({authenticated: true, _id: {$ne: req.user._id}});
    if (!users) {
        req.flash('error', "An Error Occurred");
        return res.rediect('back');
    }

    req.flash('success', 'Report Updated!');
    return res.redirect(`/reports/${updatedReport._id}`);
}

// Report PUT like report
controller.likeReport = async function(req, res) {
    const report = await PostComment.findById(req.body.report);
    if(!report) {return res.json({error: 'Error updating report.'});}

    if (report.likes.includes(req.user._id)) { //Remove like
        report.likes.splice(report.likes.indexOf(req.user._id), 1);
        await report.save();

        return res.json({
            success: `Removed a like from ${report.subject}`,
            likeCount: report.likes.length
        });
    } else {
        report.likes.push(req.user._id);
        await report.save();

        return res.json({
            success: `Liked ${report.subject}`,
            likeCount: report.likes.length
        });
    }
};

// Report PUT comment
controller.comment = async function(req, res) {
    const report = await PostComment.findById(req.body.report)
        .populate({
            path: "comments",
            populate: {
                path: "sender"
            }
        });
    if (!report) {
        return res.json({
            error: 'Error commenting'
        });
    }

    const comment = await PostComment.create({
        type: "comment",
        text: req.body.text,
        sender: req.user
    });
    if (!comment) {
        return res.json({error: 'Error commenting'});
    }

    comment.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
    await comment.save();

    report.comments.push(comment);
    await report.save();

    let users = [];
    let user;
    for (let line of comment.text.split(" ")) {
        if (line[0] == '@') {
            user = await User.findById(line.split("#")[1].split("_")[0]);

            if (!user) {
                return res.json({
                    error: "Error accessing user"
                });
            }
            users.push(user);
        }
    }

    return res.json({
        success: 'Successful comment',
        comments: report.comments
    });
}

// Report PUT like comment
controller.likeComment = async function(req, res) {
    const comment = await PostComment.findById(req.body.commentId);
    if(!comment) {return res.json({error: 'Error finding comment'});}

    if (comment.likes.includes(req.user._id)) { //Remove Like
        comment.likes.splice(comment.likes.indexOf(req.user._id), 1);
        await comment.save();
        return res.json({
            success: `Removed a like`,
            likeCount: comment.likes.length
        });

    } else { //Add Like
        comment.likes.push(req.user._id);
        comment.save();

        return res.json({
            success: `Liked comment`,
            likeCount: comment.likes.length
        });
    }
}

controller.deleteReport = async function(req, res) {
    const report = await PostComment.findById(req.params.id).populate('sender');
    if (!report) {
        req.flash('error', "Unable to access report");
        return res.redirect('back');
    }

    if (report.sender._id.toString() != req.user._id.toString()) {
        req.flash('error', "You can only delete reports that you have posted");
        return res.redirect('back');
    }

    const deletedReport = await PostComment.findByIdAndDelete(report._id);
    if (!deletedReport) {
        req.flash('error', "Unable to delete report");
        return res.redirect('back');
    }

    req.flash('success', 'Report Deleted!');
    return res.redirect('/reports/');
}

module.exports = controller;