//LIBRARIES
const {convertToLink} = require("../utils/convert-to-link");
const dateFormat = require('dateformat');
const path = require('path');
const {removeIfIncluded} = require("../utils/object-operations");
const setup = require("../utils/setup");
const {cloudUpload, cloudDelete} = require('../services/cloudinary');

//SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const {Report, PostComment} = require('../models/post');

const controller = {};

// Report GET index
controller.index = async function(req, res) {
    const platform = await setup(Platform);
    const reports = await Report.find({}).populate('sender');
    if(!platform || !reports) {req.flash('error', 'Cannot find reports.'); return res.redirect('back');}
    return res.render('reports/index', {platform, reports: reports.reverse()});
};

// Report GET new report
controller.new = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    return res.render('reports/new', {platform});
};

// Report GET show
controller.show = async function(req, res) {
    const platform = await setup(Platform);
    const report = await Report.findById(req.params.id)
        .populate('sender')
        .populate({
            path: "comments",
            populate: {path: "sender"}
        });
    if(!platform || !report) {req.flash('error', 'Could not find report'); return res.redirect('back');}

    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of report.mediaFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    const convertedText = convertToLink(report.text); //Parse and add hrefs to all links in text
    return res.render('reports/show', {platform, report, convertedText, fileExtensions});
};

// Report GET edit form
controller.updateForm = async function(req, res) {
    const platform = await setup(Platform);
    const report = await Report.findById(req.params.id);
    if(!platform || !report) {req.flash('error', 'Could not find report'); return res.redirect('back');}
    if(!report.sender._id.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that.');
        return res.redirect('back');
    }

    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of report.mediaFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    return res.render('reports/edit', {platform, report, fileExtensions});
};

// Report POST create
controller.create = async function(req, res) {
    const report = await Report.create({ //Build report with error info
        sender: req.user,
        subject: req.body.subject,
        text: req.body.message
    });
    if (!report) {
        req.flash('error', 'Unable to create report');
        return res.redirect('back');
    }

    if (req.body.images) { //If any images were added (if not, the 'images' property is null)
        for (let image in req.body.images) {
            if (image) {
                report.images.push(req.body.images[image]);
            }
        }
    }

        // if files were uploaded, process them
    if (req.files) {
        if (req.files.mediaFile) {
            let cloudErr;
            let cloudResult;
            for (let file of req.files.mediaFile) { //Upload each file to cloudinary
                if ([".mp3", ".mp4", ".m4a", ".mov"].includes(path.extname(file.originalname).toLowerCase())) {
                    [cloudErr, cloudResult] = await cloudUpload(file, "video");
                } else if (path.extname(file.originalname).toLowerCase() == ".pdf") {
                    [cloudErr, cloudResult] = await cloudUpload(file, "pdf");
                } else {
                    [cloudErr, cloudResult] = await cloudUpload(file, "image");
                }
                if (cloudErr || !cloudResult) {
                    req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }

                report.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }

    report.date = dateFormat(report.created_at, "h:MM TT | mmm d");
    await report.save();

    req.flash('success', 'Report Posted to Bulletin!');
    return res.redirect(`/reports/${report._id}`);
};

controller.updateReport = async function(req, res) {
    const report = await Report.findById(req.params.id).populate('sender');
    if (!report) {
        req.flash('error', "Unable to access report");
        return res.redirect('back');
    }

    if (report.sender._id.toString() != req.user._id.toString()) {
        req.flash('error', "You can only update reports which you have sent");
        return res.redirect('back');
    }

    //When report is updated, it might have new info to be handled
    const updatedReport = await Report.findByIdAndUpdate(req.params.id, {
        subject: req.body.subject,
        text: req.body.message,
        handled: false
    });
    if (!updatedReport) {
        req.flash('error', "Unable to update report");
        return res.redirect('back');
    }

    updatedReport.images = []; //Empty image array so that you can fill it with whatever images are added (all images are there, not just new ones)
    if (req.body.images) { //Only add images if any are provided
        for (let image in req.body.images) {
            if (image) {
                updatedReport.images.push(req.body.images[image]);
            }
        }
    }

    //Iterate through all selected media to remove and delete them
    let cloudErr;
    let cloudResult;
    for (let i = updatedReport.mediaFiles.length-1; i >= 0; i--) {
        if (req.body[`deleteUpload-${updatedReport.mediaFiles[i].url}`] && updatedReport.mediaFiles[i] && updatedReport.mediaFiles[i].filename) {
            if ([".mp3", ".mp4", ".m4a", ".mov"].includes(path.extname(updatedReport.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase())) {
                [cloudErr, cloudResult] = await cloudDelete(updatedReport.mediaFiles[i].filename, "video");
            } else if (path.extname(updatedReport.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase() == ".pdf") {
                [cloudErr, cloudResult] = await cloudDelete(updatedReport.mediaFiles[i].filename, "pdf");
            } else {
                [cloudErr, cloudResult] = await cloudDelete(updatedReport.mediaFiles[i].filename, "image");
            }
            // check for failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
            updatedReport.mediaFiles.splice(i, 1);
        }
    }

    // if files were uploaded
    if (req.files) {
        if (req.files.mediaFile) {
            //Iterate through all new attached media
            for (let file of req.files.mediaFile) {
                if ([".mp3", ".mp4", ".m4a", ".mov"].includes(path.extname(file.originalname).toLowerCase())) {
                    [cloudErr, cloudResult] = await cloudUpload(file, "video");
                } else if (path.extname(file.originalname).toLowerCase() == ".pdf") {
                    [cloudErr, cloudResult] = await cloudUpload(file, "pdf");
                } else {
                    [cloudErr, cloudResult] = await cloudUpload(file, "image");
                }
                if (cloudErr || !cloudResult) {
                    req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }

                updatedReport.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }
    
    await updatedReport.save();
    req.flash('success', 'Report Updated!');
    return res.redirect(`/reports/${updatedReport._id}`);
}

controller.handleReport = async function(req, res) {
    const report = await Report.findByIdAndUpdate(req.params.id, {handled: true});
    if (!report) {
        req.flash("error", "Unable to access report");
        return res.redirect("back");
    }
    req.flash("success", "Handled report!");
    return res.redirect("/reports/");
}

// Report PUT like report
controller.likeReport = async function(req, res) {
    const report = await Report.findById(req.body.reportId);
    if(!report) {return res.json({error: 'Error updating report.'});}

    if (removeIfIncluded(report.likes, req.user._id)) { //Remove like
        await report.save();
        return res.json({
            success: `Removed a like from ${report.subject}`,
            likeCount: report.likes.length
        });
    }

    report.likes.push(req.user._id); //Add likes to report
    await report.save();
    return res.json({
        success: `Liked ${report.subject}`,
        likeCount: report.likes.length
    });
};

// Report PUT comment
controller.comment = async function(req, res) {
    const report = await Report.findById(req.body.reportId)
        .populate({
            path: "comments",
            populate: {path: "sender"}
        });
    if (!report) {
        return res.json({
            error: 'Error commenting'
        });
    }

    const comment = await PostComment.create({
        text: req.body.text.split('<').join('&lt'),
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
    //Search for any mentioned users
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

    if (removeIfIncluded(comment.likes, req.user._id)) { //Remove Like
        await comment.save();
        return res.json({
            success: `Removed a like`,
            likeCount: comment.likes.length
        });
    }

    comment.likes.push(req.user._id); //Add Like
    await comment.save();
    return res.json({
        success: `Liked comment`,
        likeCount: comment.likes.length
    });
}

controller.deleteReport = async function(req, res) {
    const report = await Report.findById(req.params.id).populate('sender');
    if (!report) {
        req.flash('error', "Unable to access report");
        return res.redirect('back');
    }

    if (report.sender._id.toString() != req.user._id.toString()) { //Doublecheck that deleter is reporter
        req.flash('error', "You can only delete reports that you have posted");
        return res.redirect('back');
    }

    // delete any uploads
    let cloudErr;
    let cloudResult;
    for (let file of report.mediaFiles) {
        if (file && file.filename) {
            if ([".mp3", ".mp4", ".m4a", ".mov"].includes(path.extname(file.url.split("SaberChat/")[1]).toLowerCase())) {
                [cloudErr, cloudResult] = await cloudDelete(file.filename, "video");
            } else if (path.extname(file.url.split("SaberChat/")[1]).toLowerCase() == ".pdf") {
                [cloudErr, cloudResult] = await cloudDelete(file.filename, "pdf");
            } else {
                [cloudErr, cloudResult] = await cloudDelete(file.filename, "image");
            }
            // check for failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
        }
    }

    const deletedReport = await Report.findByIdAndDelete(report._id);
    if (!deletedReport) {
        req.flash('error', "Unable to delete report");
        return res.redirect('back');
    }

    req.flash('success', 'Report Deleted!');
    return res.redirect('/reports/');
}

module.exports = controller;