const dateFormat = require('dateformat');
const path = require('path');
const {sendGridEmail} = require("../services/sendGrid");
const {convertToLink, embedLink} = require("../utils/convert-to-link");
const keywordFilter = require('../utils/keywordFilter');
const {sortByPopularity} = require("../utils/popularity");
const {removeIfIncluded, parsePropertyArray, concatMatrix} = require('../utils/object-operations');
const {cloudUpload, cloudDelete} = require('../services/cloudinary');
const setup = require("../utils/setup");
const {autoCompress} = require("../utils/image-compress");

//SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const {Project, PostComment} = require('../models/post');
const {InboxMessage} = require('../models/notification');

const controller = {};

controller.index = async function(req, res) {
    const platform = await setup(Platform);
    const users = await User.find({});
    if (!platform || !users) {
        req.flash('error', 'An Error Occurred');
        return res.redirect('back');
    }

    let projects;
    if (req.user && req.user.status == platform.teacherStatus) {
        projects = await Project.find({}).populate('creators').populate('sender');
    } else {
        projects = await Project.find({verified: true}).populate('creators').populate('sender');
    }
    if (!projects) {
        req.flash('error', 'An Error Occurred');
        return res.redirect('back');
    }

    const userNames = await parsePropertyArray(users, "firstName").join(',').toLowerCase().split(',');
    const projectTexts = embedLink(req.user, projects, userNames);

    //List of media with corresponding file extensions, so they can be displayed properly
    let fileExtensions = new Map();
    for (let project of projects) {
        for (let media of project.mediaFiles) {
            fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
        }
    }
    return res.render('projects/index', {platform, projects, fileExtensions, projectTexts});
}


controller.newProject = async function(req, res) {
    const platform = await setup(Platform);
    //Find all students
    const students = await User.find({authenticated: true, status: {$in: platform.studentStatuses}}); 
    if (!platform || !students) {
        req.flash('error', "No Students Found");
        return res.redirect('back');
    }
    return res.render('projects/new', {
        platform, students,
        statuses: concatMatrix([
            platform.statusesProperty,
            platform.statusesPlural
        ]),
    });
}

controller.createProject = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    let creators = [];
    let statusGroup; //Group of creators by status
    let individual; //Individual Creator ID

    if (req.body.creatorInput != '') {
        for (let creator of req.body.creatorInput.split(',')) {
            if (platform.studentStatuses.includes(creator)) { //If the 'creator' is one of the listed status groups
                statusGroup = await User.find({authenticated: true, status: creator});  //Search for all users with that status

                if (!statusGroup) {
                    req.flash('error', "Unable to find the users you listed");
                    return res.redirect('back');
                }
                for (let user of statusGroup) {creators.push(user);}

            } else {
                individual = await User.findById(creator);
                if (!individual) {
                    req.flash('error', "Unable to find the users you listed");
                    return res.redirect('back');
                }
                creators.push(individual);
            }
        }
    }

    const project = await Project.create({
        subject: req.body.title,
        text: req.body.text,
        sender: req.user,
        creators,
        verified: !platform.postVerifiable
    });
    if (!project) {
        req.flash('error', "Unable to create project");
        return res.redirect('back');
    }
    if (req.body.images) {project.images = req.body.images;} //If any images were added (if not, the 'images' property is null)

    if (req.files) {
        if (req.files.mediaFile) { //Look for all attached files and upload them
            let cloudErr;
            let cloudResult;
            for (let file of req.files.mediaFile) {
                const processedBuffer = await autoCompress(file.originalname, file.buffer);
                [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);

                if (cloudErr || !cloudResult) {
                    req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }

                project.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }

    project.date = dateFormat(project.created_at, "h:MM TT | mmm d");
    await project.save();

    if (!platform.postVerifiable) {
        const users = await User.find({authenticated: true, _id: {$ne: req.user._id}});
        if (!users) {
            req.flash('error', "Unable to access your followers");
            return res.redirect('back');
        }

        let notif;
        let imageString = ``;
        for (let image of project.images) {imageString += `<img style="width: 50%; height: 50%;" src="${image}"/>`;}

        for (let user of users) {
            notif = await  InboxMessage.create({
                subject: "New Project Post",
                author: req.user,
                noReply: true,
                recipients: [user],
                read: [],
                toEveryone: false,
                images: project.images
            }); //Create a notification to alert the user
            if (!notif) {
                req.flash('error', 'Unable to send notification');
                return res.redirect('back');
            }

            notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
            notif.text = `Hello ${user.firstName},\n\n${req.user.firstName} ${req.user.lastName} recently posted a new project: "${project.subject}". Check it out!`;
            await notif.save();
            if (user.receiving_emails) {
                await sendGridEmail(user.email, `New Project Post - ${project.subject}`, `<p>Hello ${user.firstName},</p><p>${req.user.firstName} ${req.user.lastName} recently posted a new project: <strong>${project.subject}</strong>. Check it out!</p>${imageString}`, false);
            }

            user.inbox.push({message: notif, new: true}); //Add notif to user's inbox
            await user.save();
        }
    }

    req.flash('success', `Project Posted! A ${platform.permissionsDisplay[platform.permissionsDisplay.length-1].toLowerCase()} will verify your post soon.`);
    return res.redirect(`/projects`);
}

controller.verify = async function(req, res) {
    const platform = await setup(Platform);
    const project = await Project.findByIdAndUpdate(req.params.id, {verified: true});
    if (!platform || !project) {
        req.flash('error', "Unable to access project");
        return res.redirect('back');
    }

    if (!platform.postVerifiable) {
        const users = await User.find({authenticated: true, _id: {$ne: req.user._id}});
        if (!users) {
            req.flash('error', "Unable to access your followers");
            return res.redirect('back');
        }

        let notif;
        let imageString = ``;
        for (let image of project.images) {imageString += `<img style="width: 50%; height: 50%;" src="${image}"/>`;}

        for (let user of users) {
            notif = await  InboxMessage.create({
                subject: "New Project Post",
                author: req.user,
                noReply: true,
                recipients: [user],
                read: [],
                toEveryone: false,
                images: project.images
            }); //Create a notification to alert the user
            if (!notif) {
                req.flash('error', 'Unable to send notification');
                return res.redirect('back');
            }

            notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
            notif.text = `Hello ${user.firstName},\n\n${req.user.firstName} ${req.user.lastName} recently posted a new project: "${project.subject}". Check it out!`;
            await notif.save();
            if (user.receiving_emails) {
                await sendGridEmail(user.email, `New Project Post - ${project.subject}`, `<p>Hello ${user.firstName},</p><p>${req.user.firstName} ${req.user.lastName} recently posted a new project: <strong>${project.subject}</strong>. Check it out!</p>${imageString}`, false);
            }

            user.inbox.push({message: notif, new: true}); //Add notif to user's inbox
            await user.save();
        }
    }

    req.flash("success", "Verified Project!");
    return res.redirect("/projects");
}

controller.editProject = async function(req, res) {
    const platform = await setup(Platform);
    const project = await Project.findById(req.params.id)
        .populate('sender')
        .populate('creators');
    if (!platform || !project) {
        req.flash('error', 'Unable to find project');
        res.redirect('back');

    } else if (project.sender._id.toString() != req.user._id.toString()) { //If you didn't post the project, you can't edit it
        req.flash('error', "You may only delete projects that you have posted");
        return res.redirect('back');
    }

    let creatornames = []; //Will store a list of all the project's creators' usernames
    for (let creator of project.creators) { //Add each creator's username to creatornames
        creatornames.push(creator.username);
    }

    const students = await User.find({ //Find all students - all of whom are possible project creators
        authenticated: true,
        status: {$in: platform.studentStatuses}
    }); 

    if (!students) {
        req.flash('error', 'Unable to find student list');
        return res.redirect('back');
    }

    let fileExtensions = new Map();
    for (let media of project.mediaFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    return res.render('projects/edit', {
        platform, project, students,
        creatornames, fileExtensions,
        statuses: concatMatrix([
            platform.statusesProperty,
            platform.statusesPlural
        ]),
    });
}

controller.showProject = async function(req, res) {
    const platform = await setup(Platform);
    const project = await Project.findById(req.params.id)
        .populate('sender')
        .populate('creators')
        .populate({
            path: "comments",
            populate: {path: "sender"}
        });
    if (!platform || !project) {
        req.flash('error', "An Error Occurred");
        res.redirect('back');

    } else if (!project.verified && !(req.user.status != platform.teacherStatus)) {
        req.flash('error', 'You cannot view that project');
        return res.redirect('back');
    }

    let fileExtensions = new Map();
    for (let media of project.mediaFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    return res.render('projects/show', {platform, project, convertedText: convertToLink(project.text), fileExtensions});
}


controller.updateProject = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    let creators = [];
    let statusGroup; //Group of creators by status
    let individual; //Individual Creator ID

    if (req.body.creatorInput == '') {
        creators = [];
    } else {
        for (let creator of req.body.creatorInput.split(',')) { //Iterate throguh listed creators
            if (platform.studentStatuses.includes(creator)) { //If 'creator' is one of the statuses (grades), find all users with that status
                statusGroup = await User.find({authenticated: true, status: creator});
                if (!statusGroup) {
                    req.flash('error', "Unable to find the users you listed");
                    return res.redirect('back');
                }

                for (let user of statusGroup) {creators.push(user);}

            } else {
                individual = await User.findById(creator);
                if (!individual) {
                    req.flash('error', "Unable to find the users you listed");
                    return res.redirect('back');
                }
                creators.push(individual);
            }
        }
    }

    const project = await Project.findById(req.params.id).populate('sender');
    if (!project) {
        req.flash('error', "Unable to find project");
        return res.redirect('back');
    }

    if (project.sender._id.toString() != req.user._id.toString()) {
        req.flash('error', "You may only update projects that you have posted");
        return res.redirect('back');
    }

    const updatedProject = await Project.findByIdAndUpdate(project._id, {
        subject: req.body.title,
        creators,
        text: req.body.text,
        verified: !platform.postVerifiable
    });

    if (!updatedProject) {
        req.flash('error', "Unable to update project");
        return res.redirect('back');
    }

    if (req.body.images) {updatedProject.images = req.body.images;} //If any images were added (if not, the 'images' property is null)

    let cloudErr;
    let cloudResult;
    for (let i = updatedProject.mediaFiles.length-1; i >= 0; i--) { //Iterate through each image file and check if that file is checked on form
        //If checked, delete it
        if (req.body[`deleteUpload-${updatedProject.mediaFiles[i].url}`] && updatedProject.mediaFiles[i] && updatedProject.mediaFiles[i].filename) {
            if ([".mp3", ".mp4", ".m4a", ".mov"].includes(path.extname(updatedProject.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase())) {
                [cloudErr, cloudResult] = await cloudDelete(updatedProject.mediaFiles[i].filename, "video");
            } else if (path.extname(updatedProject.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase() == ".pdf") {
                [cloudErr, cloudResult] = await cloudDelete(updatedProject.mediaFiles[i].filename, "pdf");
            } else {
                [cloudErr, cloudResult] = await cloudDelete(updatedProject.mediaFiles[i].filename, "image");
            }
            // check for failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
            updatedProject.mediaFiles.splice(i, 1);
        }
    }

    // if files were uploaded
    if (req.files) {
        if (req.files.mediaFile) {
            for (let file of req.files.mediaFile) { //Upload each file to cloudinary basd on format
                const processedBuffer = await autoCompress(file.originalname, file.buffer);
                [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
                if (cloudErr || !cloudResult) {
                    req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }

                //Add uploaded files to project's image files
                updatedProject.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }
    await updatedProject.save();
    req.flash("success", "Project Updated!");
    return res.redirect(`/projects`);
}


controller.deleteProject = async function(req, res) {
    const project = await Project.findById(req.params.id);
    if (!project) {
        req.flash('error', "Unable to access project");
        return res.redirect('back');

    } else if (project.sender._id.toString() != req.user._id.toString()) { //If you didn't post the project, you can't delete it
        req.flash('error', "You may only delete projects that you have posted");
        return res.redirect('back');
    }

    const deletedProject = await Project.findByIdAndDelete(project._id);
    if (!deletedProject) {
        req.flash('error', "Unable to delete project");
        return res.redirect('back');
    }

    // delete any uploads
    let cloudErr;
    let cloudResult;
    for (let file of project.mediaFiles) {
        if (file && file.filename) { //Check for extension and delete accordingly
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
    req.flash("success", "Project Deleted!");
    return res.redirect('/projects');
}

controller.likeProject = async function(req, res) {
    let project = await Project.findById(req.body.projectId);
    if (!project) {
        return res.json({error: 'Error updating project'});
    }

    if (removeIfIncluded(project.likes, req.user._id)) { //Remove like
        await project.save();
        return res.json({
            success: `Removed a like from ${project.subject}`,
            likeCount: project.likes.length
        });
    }

    project.likes.push(req.user._id); //Add like
    await project.save();
    return res.json({
        success: `Liked ${project.subject}`,
        likeCount: project.likes.length
    });
}

controller.comment = async function(req, res) {
    const project = await Project.findById(req.body.projectId)
        .populate({
            path: "comments",
            populate: {
                path: "sender"
            }
        });
    if (!project) {
        return res.json({error: 'Error commenting'});
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

    project.comments.push(comment);
    await project.save();

    let users = [];
    let user;
    //Search for mentioned users in comment text
    for (let line of comment.text.split(" ")) {
        if (line[0] == '@') {
            user = await User.findById(line.split("#")[1].split("_")[0]);
            if (!user) {
                return res.json({error: "Error accessing user"});
            }
            users.push(user);
        }
    }

    let notif;
    for (let user of users) {
        notif = await  InboxMessage.create({
            subject: `New Mention in ${project.subject}`,
            author: req.user,
            noReply: true,
            recipients: [user],
            read: [],
            toEveryone: false,
            images: []
        }); //Create a notification to alert the user

        if (!notif) {
            return res.json({error: "Error creating notification"});
        }

        notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
        notif.text = `Hello ${user.firstName},\n\n${req.user.firstName} ${req.user.lastName} mentioned you in a comment on "${project.subject}":\n${comment.text}`;

        await notif.save();
        if (user.receiving_emails) {
            await sendGridEmail(user.email, `New Mention in ${project.subject}`, `<p>Hello ${user.firstName},</p><p>${req.user.firstName} ${req.user.lastName} mentioned you in a comment on <strong>${project.subject}</strong>.<p>${comment.text}</p>`, false);
        }

        user.inbox.push({message: notif, new: true}); //Add notif to user's inbox
        await user.save();
    }

    return res.json({
        success: 'Successful comment',
        comments: project.comments
    });
}

controller.likeComment = async function(req, res) {
    const comment = await PostComment.findById(req.body.commentId);
    if (!comment) {
        return res.json({error: 'Error updating comment'});
    }

    if (removeIfIncluded(comment.likes, req.user._id)) { //Remove Like
        await comment.save();
        return res.json({
            success: `Removed a like from a comment`,
            likeCount: comment.likes.length
        });
    }

    comment.likes.push(req.user._id);
    await comment.save();
    return res.json({
        success: `Liked comment`,
        likeCount: comment.likes.length
    });
}

controller.data = async function(req, res) {
    const platform = await setup(Platform);
    const projects = await Project.find({sender: req.user._id}).populate("comments");
    if (!platform || !projects) {
        req.flash('error', "Unable to find projects");
        return res.redirect('back');
    }

    const {popular, unpopular} = await sortByPopularity(projects, "likes", "created_at", null); //Extract and sort popular projects
    let popularProjectText = "";
    let popularCommentText = "";
    for (let project of popular) { //Iterate through popular projects and parse out their text
        popularProjectText += `${project.subject} ${project.text} `;
        for (let comment of project.comments) {
            popularCommentText += `${comment.text} `;
        }
    }

    //Build string of projects and comments text
    let unpopularProjectText = "";
    let unpopularCommentText = "";
    for (let project of unpopular) {
        unpopularProjectText += `${project.subject} ${project.text} `;
        for (let comment of project.comments) {
            unpopularCommentText += `${comment.text} `;
        }
    }

    //Map keywords from popular projects and their comments
    const projectKeywords = await keywordFilter(popularProjectText, unpopularProjectText);
    const commentKeywords = await keywordFilter(popularCommentText, unpopularCommentText);
    return res.render('projects/data', {platform, popularProjects: popular, projectKeywords, commentKeywords});
}

module.exports = controller;