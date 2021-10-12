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
    const users = await User.find({authenticated: true});
    if (!platform || !users) {
        await req.flash('error', 'An Error Occurred');
        return res.redirect('back');
    }

    let projects;
    if (req.user && req.user.status == platform.teacherStatus) {
        projects = await Project.find({}).populate('creators').populate('sender');
    } else {
        projects = await Project.find({verified: true}).populate('creators').populate('sender');
    }
    if (!projects) {
        await req.flash('error', 'An Error Occurred');
        return res.redirect('back');
    }

    const userNames = await parsePropertyArray(users, "firstName").join(',').toLowerCase().split(',');
    const projectTexts = await embedLink(req.user, projects, userNames);

    //List of media with corresponding file extensions, so they can be displayed properly
    let fileExtensions = new Map();
    for (let project of projects) {
        for (let media of project.mediaFiles) {
            await fileExtensions.set(media.url, await path.extname(media.url.split("SaberChat/")[1]));
        }
    }
    return res.render('projects/index', {platform, projects, fileExtensions, projectTexts});
}


controller.newProject = async function(req, res) {
    const platform = await setup(Platform);
    //Find all students
    const students = await User.find({authenticated: true, status: {$in: platform.studentStatuses}}); 
    if (!platform || !students) {
        await req.flash('error', "No Students Found");
        return res.redirect('back');
    }
    return res.render('projects/new', {
        platform, students,
        statuses: await concatMatrix([
            platform.statusesProperty,
            platform.statusesPlural
        ]),
    });
}

//Project creator search
controller.searchCreators = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {return res.json({error: "An error occurred"});}

    //Collect user data based on form
    const users = await User.find({authenticated: true, _id: {$ne: req.user._id}, status: {$in: platform.studentStatuses}});
    if (!users) {return res.json({error: "An error occurred"});}

    let creators = [];
    let displayValue;

    for (let status of platform.studentStatuses) { //Iterate through statuses and search for matches
        displayValue = platform.statusesPlural[platform.statusesProperty.indexOf(status)];
        if (await `${status} ${displayValue}`.toLowerCase().includes(await req.body.text.toLowerCase())) {
            await creators.push({ //Add status to array, using display and id values
                displayValue,
                idValue: status,
                type: "status"
            });
        }
    }

    for (let user of users) { //Iterate through usernames and search for matches
        if (await `${user.firstName} ${user.lastName} ${user.username}`.toLowerCase().includes(await req.body.text.toLowerCase())) {
            await creators.push({ //Add user to array, using username as display, and id as id value
                displayValue: `${user.firstName} ${user.lastName} (${user.username})`, 
                idValue: user._id,
                classValue: user.status,
                type: "user"
            });
        }
    }

    return res.json({success: "Successfully collected data", creators});
}

controller.createProject = async function(req, res) {
    console.log(req.body.creatorInput);
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    let creators = [];
    let nonaccountCreators = [];
    let statusGroup; //Group of creators by status
    let individual; //Individual Creator ID

    if (req.body.creatorInput != '') {
        for (let creator of (await req.body.creatorInput.split(','))) {
            if (await platform.studentStatuses.includes(creator)) { //If the 'creator' is one of the listed status groups
                statusGroup = await User.find({authenticated: true, status: creator});  //Search for all users with that status
                for (let user of statusGroup) {await creators.push(user);}
            } else {
                try {
                    individual = await User.findById(creator);
                    await creators.push(individual);
                } catch (err) {
                    await nonaccountCreators.push(creator);
                }
            }
        }
    }

    const project = await Project.create({
        subject: req.body.title,
        text: req.body.text,
        sender: req.user,
        creators, nonaccountCreators,
        verified: !platform.postVerifiable
    });
    if (!project) {
        await req.flash('error', "Unable to create project");
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
                    await req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }

                await project.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }

    project.date = await dateFormat(project.created_at, "h:MM TT | mmm d");
    await project.save();

    if (!platform.postVerifiable) {
        const users = await User.find({authenticated: true, _id: {$ne: req.user._id}});
        if (!users) {
            await req.flash('error', "Unable to access your followers");
            return res.redirect('back');
        }

        let notif;
        let imageString = ``;
        for (let image of project.images) {imageString += `<img style="width: 50%; height: 50%;" src="${image}"/>`;}

        for (let user of users) {
            notif = await InboxMessage.create({
                subject: "New Project Post",
                author: req.user,
                noReply: true,
                recipients: [user],
                read: [],
                toEveryone: false,
                images: project.images
            }); //Create a notification to alert the user
            if (!notif) {
                await req.flash('error', 'Unable to send notification');
                return res.redirect('back');
            }

            notif.date = await dateFormat(notif.created_at, "h:MM TT | mmm d");
            notif.text = `Hello ${user.firstName},\n\n${req.user.firstName} ${req.user.lastName} recently posted a new project: "${project.subject}". Check it out!`;
            await notif.save();
            if (user.receiving_emails) {
                await sendGridEmail(user.email, `New Project Post - ${project.subject}`, `<p>Hello ${user.firstName},</p><p>${req.user.firstName} ${req.user.lastName} recently posted a new project: <strong>${project.subject}</strong>. Check it out!</p>${imageString}`, false);
            }

            await user.inbox.push({message: notif, new: true}); //Add notif to user's inbox
            await user.save();
        }
    }

    if (platform.postVerifiable) {
        await req.flash('success', `Project Posted! A platform ${await platform.permissionsDisplay[platform.permissionsDisplay.length-1].toLowerCase()} will verify your post soon.`);
    } else {
        await req.flash('success', `Project Posted!`);
    }
    return res.redirect(`/projects/${project._id}`);
}

controller.verify = async function(req, res) {
    const platform = await setup(Platform);
    const project = await Project.findByIdAndUpdate(req.params.id, {verified: true});
    if (!platform || !project) {
        await req.flash('error', "Unable to access project");
        return res.redirect('back');
    }

    if (!platform.postVerifiable) {
        const users = await User.find({authenticated: true, _id: {$ne: req.user._id}});
        if (!users) {
            await req.flash('error', "Unable to access your followers");
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
                await req.flash('error', 'Unable to send notification');
                return res.redirect('back');
            }

            notif.date = await dateFormat(notif.created_at, "h:MM TT | mmm d");
            notif.text = `Hello ${user.firstName},\n\n${req.user.firstName} ${req.user.lastName} recently posted a new project: "${project.subject}". Check it out!`;
            await notif.save();
            if (user.receiving_emails) {
                await sendGridEmail(user.email, `New Project Post - ${project.subject}`, `<p>Hello ${user.firstName},</p><p>${req.user.firstName} ${req.user.lastName} recently posted a new project: <strong>${project.subject}</strong>. Check it out!</p>${imageString}`, false);
            }

            await user.inbox.push({message: notif, new: true}); //Add notif to user's inbox
            await user.save();
        }
    }

    await req.flash("success", "Verified Project!");
    return res.redirect("/projects");
}

controller.editProject = async function(req, res) {
    const platform = await setup(Platform);
    const project = await Project.findById(req.params.id)
        .populate('sender')
        .populate('creators');
    if (!platform || !project) {
        await req.flash('error', 'Unable to find project');
        return res.redirect('back');

    } else if ((await project.sender._id.toString()) != (await req.user._id.toString())) { //If you didn't post the project, you can't edit it
        await req.flash('error', "You may only delete projects that you have posted");
        return res.redirect('back');
    }

    let creatornames = []; //Will store a list of all the project's creators' usernames
    for (let creator of project.creators) { //Add each creator's username to creatornames
        await creatornames.push(creator.username);
    }

    const students = await User.find({ //Find all students - all of whom are possible project creators
        authenticated: true,
        status: {$in: platform.studentStatuses}
    }); 

    if (!students) {
        await req.flash('error', 'Unable to find student list');
        return res.redirect('back');
    }

    let fileExtensions = new Map();
    for (let media of project.mediaFiles) {
        await fileExtensions.set(media.url, await path.extname(media.url.split("SaberChat/")[1]));
    }
    return res.render('projects/edit', {
        platform, project, students,
        creatornames, fileExtensions,
        statuses: await concatMatrix([
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
        await req.flash('error', "An Error Occurred");
        return res.redirect('back');

    } else if (!project.verified && !(req.user.status != platform.teacherStatus)) {
        await req.flash('error', 'You cannot view that project');
        return res.redirect('back');
    }

    let fileExtensions = new Map();
    for (let media of project.mediaFiles) {
        await fileExtensions.set(media.url, await path.extname(media.url.split("SaberChat/")[1]));
    }
    return res.render('projects/show', {platform, project, convertedText: await convertToLink(project.text), fileExtensions});
}


controller.updateProject = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    let creators = [];
    let nonaccountCreators = [];
    let statusGroup; //Group of creators by status
    let individual; //Individual Creator ID

    if (req.body.creatorInput == '') {
        creators = [];
        
    } else {
        for (let creator of await req.body.creatorInput.split(',')) { //Iterate throguh listed creators
            if (await platform.studentStatuses.includes(creator)) { //If 'creator' is one of the statuses (grades), find all users with that status
                statusGroup = await User.find({authenticated: true, status: creator});
                for (let user of statusGroup) {await creators.push(user);}
            } else {
                try {
                    individual = await User.findById(creator);
                    await creators.push(individual);
                } catch (err) {
                    await nonaccountCreators.push(creator);
                }
            }
        }
    }

    const project = await Project.findById(req.params.id).populate('sender');
    if (!project) {
        await req.flash('error', "Unable to find project");
        return res.redirect('back');
    }

    if ((await project.sender._id.toString()) != (await req.user._id.toString())) {
        await req.flash('error', "You may only update projects that you have posted");
        return res.redirect('back');
    }

    const updatedProject = await Project.findByIdAndUpdate(project._id, {
        subject: req.body.title,
        creators, nonaccountCreators,
        text: req.body.text,
        verified: !platform.postVerifiable
    });

    if (!updatedProject) {
        await req.flash('error', "Unable to update project");
        return res.redirect('back');
    }

    if (req.body.images) {updatedProject.images = req.body.images;} //If any images were added (if not, the 'images' property is null)

    let cloudErr;
    let cloudResult;
    for (let i = updatedProject.mediaFiles.length-1; i >= 0; i--) { //Iterate through each image file and check if that file is checked on form
        //If checked, delete it
        if (req.body[`deleteUpload-${updatedProject.mediaFiles[i].url}`] && updatedProject.mediaFiles[i] && updatedProject.mediaFiles[i].filename) {
            //Evaluate filetype to decide on file deletion strategy
            switch(await path.extname(await updatedProject.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase()) {
                case ".mp3":
                case ".mp4":
                case ".m4a":
                case ".mov":
                    [cloudErr, cloudResult] = await cloudDelete(updatedProject.mediaFiles[i].filename, "video");
                    break;
                case ".pdf":
                    [cloudErr, cloudResult] = await cloudDelete(updatedProject.mediaFiles[i].filename, "pdf");
                    break;
                default:
                    [cloudErr, cloudResult] = await cloudDelete(updatedProject.mediaFiles[i].filename, "image");
            }

            // Check For Failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                await req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
            await updatedProject.mediaFiles.splice(i, 1);
        }
    }

    // if files were uploaded
    if (req.files) {
        if (req.files.mediaFile) {
            for (let file of req.files.mediaFile) { //Upload each file to cloudinary basd on format
                const processedBuffer = await autoCompress(file.originalname, file.buffer);
                [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
                if (cloudErr || !cloudResult) {
                    await req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }

                //Add uploaded files to project's image files
                await updatedProject.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }
    await updatedProject.save();
    await req.flash("success", "Project Updated!");
    return res.redirect(`/projects/${project._id}`);
}


controller.deleteProject = async function(req, res) {
    const project = await Project.findById(req.params.id);
    if (!project) {
        await req.flash('error', "Unable to access project");
        return res.redirect('back');

    } else if ((await project.sender._id.toString()) != (await req.user._id.toString())) { //If you didn't post the project, you can't delete it
        await req.flash('error', "You may only delete projects that you have posted");
        return res.redirect('back');
    }

    const deletedProject = await Project.findByIdAndDelete(project._id);
    if (!deletedProject) {
        await req.flash('error', "Unable to delete project");
        return res.redirect('back');
    }

    // delete any uploads
    let cloudErr;
    let cloudResult;
    for (let file of project.mediaFiles) {
        if (file && file.filename) {
            //Evaluate deleted files' filetype and delete accordingly
            switch(await path.extname(await file.url.split("SaberChat/")[1]).toLowerCase()) {
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
                await req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
        }
    }
    await req.flash("success", "Project Deleted!");
    return res.redirect('/projects');
}

controller.likeProject = async function(req, res) {
    let project = await Project.findById(req.body.projectId);
    if (!project) {
        return res.json({error: 'Error updating project'});
    }

    if (await removeIfIncluded(project.likes, req.user._id)) { //Remove like
        await project.save();
        return res.json({
            success: `Removed a like from ${project.subject}`,
            likeCount: project.likes.length
        });
    }

    await project.likes.push(req.user._id); //Add like
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
        text: await req.body.text.split('<').join('&lt'),
        sender: req.user
    });
    if (!comment) {
        return res.json({error: 'Error commenting'});
    }

    comment.date = await dateFormat(comment.created_at, "h:MM TT | mmm d");
    await comment.save();

    await project.comments.push(comment);
    await project.save();

    let users = [];
    let user;
    //Search for mentioned users in comment text
    for (let line of await comment.text.split(" ")) {
        if (line[0] == '@') {
            user = await User.findById(await line.split("#")[1].split("_")[0]);
            if (!user) {
                return res.json({error: "Error accessing user"});
            }
            await users.push(user);
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

        notif.date = await dateFormat(notif.created_at, "h:MM TT | mmm d");
        notif.text = `Hello ${user.firstName},\n\n${req.user.firstName} ${req.user.lastName} mentioned you in a comment on "${project.subject}":\n${comment.text}`;

        await notif.save();
        if (user.receiving_emails) {
            await sendGridEmail(user.email, `New Mention in ${project.subject}`, `<p>Hello ${user.firstName},</p><p>${req.user.firstName} ${req.user.lastName} mentioned you in a comment on <strong>${project.subject}</strong>.<p>${comment.text}</p>`, false);
        }

        await user.inbox.push({message: notif, new: true}); //Add notif to user's inbox
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

    if (await removeIfIncluded(comment.likes, req.user._id)) { //Remove Like
        await comment.save();
        return res.json({
            success: `Removed a like from a comment`,
            likeCount: comment.likes.length
        });
    }

    await comment.likes.push(req.user._id);
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
        await req.flash('error', "Unable to find projects");
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