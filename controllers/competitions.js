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
const {Competition, PostComment} = require('../models/post');

const controller = {};

// Competition GET index
controller.index = async function(req, res) {
    const platform = await setup(Platform);
    const competitions = await Competition.find({}).populate('sender');
    if(!platform || !competitions) {req.flash('error', 'Cannot find competitions.'); return res.redirect('back');}

    let current = [];
    let past = [];
    let date;
    for (let competition of competitions) {
        date = new Date(parseInt(competition.deadline.year), parseInt(competition.deadline.month)-1, parseInt(competition.deadline.day));
        if (date.getTime > new Date().getTime()) {
            past.push(competition);
        } else {
            current.push(competition);
        }
    }

    if (req.query.past) {
        return res.render('competitions/index', {platform, competitions: past.reverse(), activeSearch: false});   
    }
    return res.render('competitions/index', {platform, competitions: current.reverse(), activeSearch: true});
};

// Competition GET new competition
controller.new = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    return res.render('competitions/new', {platform});
};

// Competition GET show
controller.show = async function(req, res) {
    const platform = await setup(Platform);
    const competition = await Competition.findById(req.params.id)
        .populate('sender')
        .populate({
            path: "comments",
            populate: {path: "sender"}
        });
    if(!platform || !competition) {req.flash('error', 'Could not find competition'); return res.redirect('back');}

    let date = new Date(parseInt(competition.deadline.year), parseInt(competition.deadline.month)-1, parseInt(competition.deadline.day));
    let version = (date.getTime < new Date().getTime());

    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of competition.mediaFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    const convertedText = convertToLink(competition.text); //Parse and add hrefs to all links in text
    return res.render('competitions/show', {platform, competition, convertedText, fileExtensions, version});
};

// Competition GET edit form
controller.updateForm = async function(req, res) {
    const platform = await setup(Platform);
    const competition = await Competition.findById(req.params.id);
    if(!platform || !competition) {req.flash('error', 'Could not find competition'); return res.redirect('back');}
    if(!competition.sender._id.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that.');
        return res.redirect('back');
    }

    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of competition.mediaFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    return res.render('competitions/edit', {platform, competition, fileExtensions});
};

// Competition POST create
controller.create = async function(req, res) {
    const competition = await Competition.create({ //Build competition with error info
        sender: req.user,
        subject: req.body.subject,
        text: req.body.message,
        deadline: {
            day: req.body.day,
            month: req.body.month,
            year: req.body.year
        }
    });
    if (!competition) {
        req.flash('error', 'Unable to create competition');
        return res.redirect('back');
    }

    for (let attr of ["images", "links"]) { //Add images and links
        if (req.body[attr]) {
            competition[attr] = req.body[attr];
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

                competition.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }

    competition.date = dateFormat(competition.created_at, "h:MM TT | mmm d");
    await competition.save();

    req.flash('success', 'Competition Posted to Bulletin!');
    return res.redirect(`/competitions/${competition._id}`);
};

controller.updateCompetition = async function(req, res) {
    const competition = await Competition.findById(req.params.id).populate('sender');
    if (!competition) {
        req.flash('error', "Unable to access competition");
        return res.redirect('back');
    }

    if (competition.sender._id.toString() != req.user._id.toString()) {
        req.flash('error', "You can only update competitions which you have sent");
        return res.redirect('back');
    }

    const updatedCompetition = await Competition.findByIdAndUpdate(req.params.id, {
        subject: req.body.subject,
        text: req.body.message,
        deadline: {
            day: req.body.day,
            month: req.body.month,
            year: req.body.year
        }
    });
    if (!updatedCompetition) {
        req.flash('error', "Unable to update competition");
        return res.redirect('back');
    }

    for (let attr of ["images", "links"]) { //Add images and links
        if (req.body[attr]) {
            updatedCompetition[attr] = req.body[attr];
        }
    }

    //Iterate through all selected media to remove and delete them
    let cloudErr;
    let cloudResult;
    for (let i = updatedCompetition.mediaFiles.length-1; i >= 0; i--) {
        if (req.body[`deleteUpload-${updatedCompetition.mediaFiles[i].url}`] && updatedCompetition.mediaFiles[i] && updatedCompetition.mediaFiles[i].filename) {
            if ([".mp3", ".mp4", ".m4a", ".mov"].includes(path.extname(updatedCompetition.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase())) {
                [cloudErr, cloudResult] = await cloudDelete(updatedCompetition.mediaFiles[i].filename, "video");
            } else if (path.extname(updatedCompetition.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase() == ".pdf") {
                [cloudErr, cloudResult] = await cloudDelete(updatedCompetition.mediaFiles[i].filename, "pdf");
            } else {
                [cloudErr, cloudResult] = await cloudDelete(updatedCompetition.mediaFiles[i].filename, "image");
            }
            // check for failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
            updatedCompetition.mediaFiles.splice(i, 1);
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

                updatedCompetition.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }
    
    await updatedCompetition.save();
    req.flash('success', 'Competition Updated!');
    return res.redirect(`/competitions/${updatedCompetition._id}`);
}

// Competition PUT like competition
controller.likeCompetition = async function(req, res) {
    const competition = await Competition.findById(req.body.competitionId);
    if(!competition) {return res.json({error: 'Error updating competition.'});}

    if (removeIfIncluded(competition.likes, req.user._id)) { //Remove like
        await competition.save();
        return res.json({
            success: `Removed a like from ${competition.subject}`,
            likeCount: competition.likes.length
        });
    }

    competition.likes.push(req.user._id); //Add likes to competition
    await competition.save();
    return res.json({
        success: `Liked ${competition.subject}`,
        likeCount: competition.likes.length
    });
};

// Competition PUT comment
controller.comment = async function(req, res) {
    const competition = await Competition.findById(req.body.competitionId)
        .populate({
            path: "comments",
            populate: {path: "sender"}
        });
    if (!competition) {
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

    competition.comments.push(comment);
    await competition.save();

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
        comments: competition.comments
    });
}

// Competition PUT like comment
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

controller.deleteCompetition = async function(req, res) {
    const competition = await Competition.findById(req.params.id).populate('sender');
    if (!competition) {
        req.flash('error', "Unable to access competition");
        return res.redirect('back');
    }

    if (competition.sender._id.toString() != req.user._id.toString()) { //Doublecheck that deleter is competitioner
        req.flash('error', "You can only delete competitions that you have posted");
        return res.redirect('back');
    }

    // delete any uploads
    let cloudErr;
    let cloudResult;
    for (let file of competition.mediaFiles) {
        if (file && file.filename) {
            if ([".mp3", ".mp4", ".m4a", ".mov"].includes(path.extname(file.url.split("SaberChat/")[1]).toLowerCase())) {
                [cloudErr, cloudResult] = await cloudDelete(file.filename, "video");
            } else if (path.extname(file.url.split("SaberChat/")[1]).toLowerCase() == ".pdf") {
                [cloudErr, cloudResult] = await cloudDelete(file.filename, "pdf");
            } else {
            }
                [cloudErr, cloudResult] = await cloudDelete(file.filename, "image");
            // check for failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
        }
    }

    const deletedCompetition = await Competition.findByIdAndDelete(competition._id);
    if (!deletedCompetition) {
        req.flash('error', "Unable to delete competition");
        return res.redirect('back');
    }

    req.flash('success', 'Competition Deleted!');
    return res.redirect('/competitions/');
}

module.exports = controller;