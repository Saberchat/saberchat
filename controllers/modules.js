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
const {Module, PostComment} = require('../models/post');

const controller = {};

// Module GET index
controller.index = async function(req, res) {
    const platform = await setup(Platform);
    const modules = await Module.find({}).populate('sender');
    if(!platform || !modules) {req.flash('error', 'Cannot find modules.'); return res.redirect('back');}
    return res.render('modules/index', {platform, modules: modules.reverse()});
};

// Module GET new module
controller.new = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    return res.render('modules/new', {platform});
};

// Module GET show
controller.show = async function(req, res) {
    const platform = await setup(Platform);
    const module = await Module.findById(req.params.id)
        .populate('sender')
        .populate({
            path: "comments",
            populate: {path: "sender"}
        });
    if(!platform || !module) {req.flash('error', 'Could not find module'); return res.redirect('back');}

    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of module.mediaFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    const convertedText = convertToLink(module.text); //Parse and add hrefs to all links in text
    return res.render('modules/show', {platform, module, convertedText, fileExtensions});
};

// Module GET edit form
controller.updateForm = async function(req, res) {
    const platform = await setup(Platform);
    const module = await Module.findById(req.params.id);
    if(!platform || !module) {req.flash('error', 'Could not find module'); return res.redirect('back');}
    if(!module.sender._id.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that.');
        return res.redirect('back');
    }

    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of module.mediaFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    return res.render('modules/edit', {platform, module, fileExtensions});
};

// Module POST create
controller.create = async function(req, res) {
    const module = await Module.create({ //Build module with error info
        sender: req.user,
        subject: req.body.subject,
        text: req.body.message
    });
    if (!module) {
        req.flash('error', 'Unable to create module');
        return res.redirect('back');
    }

    if (req.body.images) { //If any images were added (if not, the 'images' property is null)
        for (let image in req.body.images) {
            module.images.push(req.body.images[image]);
        }
    }

    if (req.body.slides) {
        for (let slide in req.body.slides) {
            module.slides.push(req.body.slides[slide]);
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

                module.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }

    module.date = dateFormat(module.created_at, "h:MM TT | mmm d");
    await module.save();

    req.flash('success', 'Module Posted to Bulletin!');
    return res.redirect(`/modules/${module._id}`);
};

controller.updateModule = async function(req, res) {
    const module = await Module.findById(req.params.id).populate('sender');
    if (!module) {
        req.flash('error', "Unable to access module");
        return res.redirect('back');
    }

    if (module.sender._id.toString() != req.user._id.toString()) {
        req.flash('error', "You can only update modules which you have sent");
        return res.redirect('back');
    }

    const updatedModule = await Module.findByIdAndUpdate(req.params.id, {
        subject: req.body.subject,
        text: req.body.message,
    });
    if (!updatedModule) {
        req.flash('error', "Unable to update module");
        return res.redirect('back');
    }

    updatedModule.images = []; //Empty image array so that you can fill it with whatever images are added (all images are there, not just new ones)
    if (req.body.images) { //Only add images if any are provided
        for (let image in req.body.images) {
            updatedModule.images.push(req.body.images[image]);
        }
    }

    updatedModule.images = [];
    if (req.body.slides) {
        for (let slide in req.body.slides) {
            updatedModule.slides.push(req.body.slides[slide]);
        }
    }

    //Iterate through all selected media to remove and delete them
    let cloudErr;
    let cloudResult;
    for (let i = updatedModule.mediaFiles.length-1; i >= 0; i--) {
        if (req.body[`deleteUpload-${updatedModule.mediaFiles[i].url}`] && updatedModule.mediaFiles[i] && updatedModule.mediaFiles[i].filename) {
            if ([".mp3", ".mp4", ".m4a", ".mov"].includes(path.extname(updatedModule.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase())) {
                [cloudErr, cloudResult] = await cloudDelete(updatedModule.mediaFiles[i].filename, "video");
            } else if (path.extname(updatedModule.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase() == ".pdf") {
                [cloudErr, cloudResult] = await cloudDelete(updatedModule.mediaFiles[i].filename, "pdf");
            } else {
                [cloudErr, cloudResult] = await cloudDelete(updatedModule.mediaFiles[i].filename, "image");
            }
            // check for failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
            updatedModule.mediaFiles.splice(i, 1);
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

                updatedModule.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }
    
    await updatedModule.save();
    req.flash('success', 'Module Updated!');
    return res.redirect(`/modules/${updatedModule._id}`);
}

// Module PUT like module
controller.likeModule = async function(req, res) {
    const module = await Module.findById(req.body.moduleId);
    if(!module) {return res.json({error: 'Error updating module.'});}

    if (removeIfIncluded(module.likes, req.user._id)) { //Remove like
        await module.save();
        return res.json({
            success: `Removed a like from ${module.subject}`,
            likeCount: module.likes.length
        });
    }

    module.likes.push(req.user._id); //Add likes to module
    await module.save();
    return res.json({
        success: `Liked ${module.subject}`,
        likeCount: module.likes.length
    });
};

// Module PUT comment
controller.comment = async function(req, res) {
    const module = await Module.findById(req.body.moduleId)
        .populate({
            path: "comments",
            populate: {path: "sender"}
        });
    if (!module) {
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

    module.comments.push(comment);
    await module.save();

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
        comments: module.comments
    });
}

// Module PUT like comment
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

controller.deleteModule = async function(req, res) {
    const module = await Module.findById(req.params.id).populate('sender');
    if (!module) {
        req.flash('error', "Unable to access module");
        return res.redirect('back');
    }

    if (module.sender._id.toString() != req.user._id.toString()) { //Doublecheck that deleter is moduleer
        req.flash('error', "You can only delete modules that you have posted");
        return res.redirect('back');
    }

    // delete any uploads
    let cloudErr;
    let cloudResult;
    for (let file of module.mediaFiles) {
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

    const deletedModule = await Module.findByIdAndDelete(module._id);
    if (!deletedModule) {
        req.flash('error', "Unable to delete module");
        return res.redirect('back');
    }

    req.flash('success', 'Module Deleted!');
    return res.redirect('/modules/');
}

module.exports = controller;