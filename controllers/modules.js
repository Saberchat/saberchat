//LIBRARIES
const {convertToLink, embedLink} = require("../utils/convert-to-link");
const dateFormat = require('dateformat');
const path = require('path');
const {objectArrIndex, removeIfIncluded, parsePropertyArray} = require("../utils/object-operations");
const setup = require("../utils/setup");
const {cloudUpload, cloudDelete} = require('../services/cloudinary');
const {autoCompress} = require("../utils/image-compress");

//SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const {Module, PostComment} = require('../models/post');

const controller = {};

// Module GET index
controller.index = async function(req, res) {
    const platform = await setup(Platform);
    const users = await User.find({authenticated: true});
    let modules;
    if (req.user && (await platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission))) {
        modules = await Module.find({}).populate('sender');
    } else {
        modules = await Module.find({verified: true}).populate('sender');
    }

    if(!platform || !users || !modules) {
        req.flash('error', 'Cannot find modules.');
        return res.redirect('back');
    }

    const userNames = parsePropertyArray(users, "firstName").join(',').toLowerCase().split(',');
    const moduleTexts = await embedLink(req.user, modules, userNames);

    return res.render('modules/index', {platform, modules: await modules.reverse(), data: platform.features[objectArrIndex(platform.features, "route", "modules")], moduleTexts});
};

controller.new = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    return res.render('modules/new', {platform, data: platform.features[objectArrIndex(platform.features, "route", "modules")]});
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
    if(!platform || !module) {
        req.flash('error', 'Could not find module');
        return res.redirect('back');

    } else if (!module.verified && !(await platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission))) {
        req.flash('error', 'You cannot view that module');
        return res.redirect('back');
    }

    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of module.mediaFiles) {
        fileExtensions.set(media.url, path.extname(await media.url.split("SaberChat/")[1]));
    }
    return res.render('modules/show', {platform, module, convertedText: await convertToLink(module.text), fileExtensions, data: platform.features[objectArrIndex(platform.features, "route", "modules")]});
};

// Module GET edit form
controller.updateForm = async function(req, res) {
    const platform = await setup(Platform);
    const module = await Module.findById(req.params.id);
    if(!platform || !module) {
        req.flash('error', 'Could not find module');
        return res.redirect('back');
    }
    
    if(!(await module.sender._id.equals(req.user._id))) {
        req.flash('error', 'You do not have permission to do that.');
        return res.redirect('back');
    }

    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of module.mediaFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    return res.render('modules/edit', {platform, module, fileExtensions, data: platform.features[objectArrIndex(platform.features, "route", "modules")]});
};

// Module POST create
controller.create = async function(req, res) {
    const platform = await setup(Platform);
    const module = await Module.create({ //Build module with error info
        sender: req.user,
        subject: req.body.subject,
        text: req.body.message,
        verified: true
    });
    if (!platform || !module) {
        req.flash('error', 'Unable to create module');
        return res.redirect('back');
    }

    for (let attr of ["images", "links"]) { //Add images and links
        if (req.body[attr]) {
            module[attr] = req.body[attr];
        }
    }

        // if files were uploaded, process them
    if (req.files) {
        if (req.files.mediaFile) {
            let cloudErr;
            let cloudResult;
            for (let file of req.files.mediaFile) { //Upload each file to cloudinary
                const processedBuffer = await autoCompress(file.originalname, file.buffer);
                [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
                if (cloudErr || !cloudResult) {
                    req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }

                await module.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }

    module.date = dateFormat(module.created_at, "h:MM TT | mmm d");
    await module.save();

    if (platform.postVerifiable) {
        req.flash('success', `Module Posted! A platform ${await platform.permissionsDisplay[platform.permissionsDisplay.length-1].toLowerCase()} will verify your post soon.`);
    } else {
        req.flash('success', `Module Posted!`);
    }
    return res.redirect(`/modules`);
};

controller.updateModule = async function(req, res) {
    const platform = await setup(Platform);
    const module = await Module.findById(req.params.id).populate('sender');
    if (!platform || !module) {
        req.flash('error', "Unable to access module");
        return res.redirect('back');
    }

    if ((await module.sender._id.toString()) != (await req.user._id.toString())) {
        req.flash('error', "You can only update modules which you have sent");
        return res.redirect('back');
    }

    const updatedModule = await Module.findByIdAndUpdate(req.params.id, {
        subject: req.body.subject,
        text: req.body.message,
        verified: true
    });
    if (!updatedModule) {
        req.flash('error', "Unable to update module");
        return res.redirect('back');
    }

    for (let attr of ["images", "links"]) {if (req.body[attr]) {updatedModule[attr] = req.body[attr];}} //Add images and links

    //Iterate through all selected media to remove and delete them
    let cloudErr;
    let cloudResult;
    for (let i = updatedModule.mediaFiles.length-1; i >= 0; i--) {
        if (req.body[`deleteUpload-${updatedModule.mediaFiles[i].url}`] && updatedModule.mediaFiles[i] && updatedModule.mediaFiles[i].filename) {
            //Evaluate filetype to decide on file deletion strategy
            switch(path.extname(await updatedModule.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase()) {
                case ".mp3":
                case ".mp4":
                case ".m4a":
                case ".mov":
                    [cloudErr, cloudResult] = await cloudDelete(updatedModule.mediaFiles[i].filename, "video");
                    break;
                case ".pdf":
                    [cloudErr, cloudResult] = await cloudDelete(updatedModule.mediaFiles[i].filename, "pdf");
                    break;
                default:
                    [cloudErr, cloudResult] = await cloudDelete(updatedModule.mediaFiles[i].filename, "image");
            }

            // Check For Failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
            await updatedModule.mediaFiles.splice(i, 1);
        }
    }

    // if files were uploaded
    if (req.files) {
        if (req.files.mediaFile) {
            //Iterate through all new attached media
            for (let file of req.files.mediaFile) {
                const processedBuffer = await autoCompress(file.originalname, file.buffer);
                [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
                if (cloudErr || !cloudResult) {
                    req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }

                await updatedModule.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }
    
    await updatedModule.save();
    req.flash('success', 'Module Updated!');
    return res.redirect(`/modules`);
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

    await module.likes.push(req.user._id); //Add likes to module
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
    if (!module) {return res.json({error: 'Error commenting'});}

    const comment = await PostComment.create({
        text: await req.body.text.split('<').join('&lt'),
        sender: req.user
    });
    if (!comment) {return res.json({error: 'Error commenting'});}
    comment.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
    await comment.save();

    await module.comments.push(comment);
    await module.save();

    let users = [];
    let user;
    //Search for any mentioned users
    for (let line of await comment.text.split(" ")) {
        if (line[0] == '@') {
            user = await User.findById(await line.split("#")[1].split("_")[0]);

            if (!user) {
                return res.json({
                    error: "Error accessing user"
                });
            }
            await users.push(user);
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

    await comment.likes.push(req.user._id); //Add Like
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

    if ((await module.sender._id.toString()) != (await req.user._id.toString())) { //Doublecheck that deleter is moduleer
        req.flash('error', "You can only delete modules that you have posted");
        return res.redirect('back');
    }

    // delete any uploads
    let cloudErr;
    let cloudResult;
    for (let file of module.mediaFiles) {
        if (file && file.filename) {
            //Evaluate deleted files' filetype and delete accordingly
            switch(path.extname(await file.url.split("SaberChat/")[1]).toLowerCase()) {
                case ".mp3":
                case ".mp4":
                case ".m4a":
                case ".mov":
                    [cloudErr, cloudResult] = await cloudDelete(file.filename, "video");
                    break;
                case ".pdf":
                    [cloudErr, cloudResult] = await cloudDelete(file.filename, "pdf");
                    break;
                default:
                    [cloudErr, cloudResult] = await cloudDelete(file.filename, "image");
            }

            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') { // Check for Failure
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