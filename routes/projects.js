//Project routes dictate the posting, viewing, and editing of the Saberchat Student Projects Board

//LIBRARIES
const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat');
const path = require('path');
const {sendGridEmail} = require("../services/sendGrid");
const {convertToLink} = require("../utils/convert-to-link");
const {filter} = require('../utils/filter');
const {sortByPopularity} = require("../utils/popularity-algorithms");

const {multipleUpload} = require('../middleware/multer');
const {cloudUpload, cloudDelete} = require('../services/cloudinary');
const {validateProject} = require('../middleware/validation');

//SCHEMA
const User = require('../models/user');
const Project = require('../models/projects/project');
const Notification = require('../models/inbox/message');
const PostComment = require('../models/postComment');

//ROUTES
router.get('/', (req, res) => { //RESTful Routing 'INDEX' route

    Project.find({})
        .populate('creators')
        .populate('poster')
        .exec((err, projects) => { //Find all projects, collect info on their creators and posters (part of the 'User' schema)
            if (err || !projects) {
                req.flash('error', 'An Error Occurred');
                res.redirect('back');

            } else {
                let fileExtensions = new Map();
                for (let project of projects) {
                    for (let media of project.imageFiles) {
                        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
                    }
                }
                res.render('projects/index', {projects, fileExtensions}); //Post the project data to HTML page, which formats the data
            }
        });
});

router.get('/new', middleware.isLoggedIn, middleware.isFaculty, (req, res) => { ////RESTful Routing 'NEW' route
    User.find({authenticated: true, status: {$nin: ['alumnus', 'guest', 'parent', 'faculty']}}, (err, users) => { //Find all students, so that when teachers post a project, they can select which students created it
        if (err || !users) {
            req.flash('error', 'An Error Occurred');
            res.redirect('back');

        } else {
            res.render('projects/new', {students: users});
        }
    });
});

router.post('/', middleware.isLoggedIn, middleware.isFaculty, multipleUpload, validateProject, (req, res) => { //RESTful Routing 'CREATE' route
    (async () => { //Asynchronous functions dictates that processes occur one at a time, reducing excessive callbacks
        let creators = [];
        let statusGroup; //Group of creators by status
        let individual; //Individual Creator ID

        if (req.body.creatorInput != '') {
            let statuses = ['7th', '8th', '9th', '10th', '11th', '12th'];

            for (let creator of req.body.creatorInput.split(',')) {
                if (statuses.includes(creator)) {
                    statusGroup = await User.find({authenticated: true, status: creator});

                    if (!statusGroup) {
                        req.flash('error', "Unable to find the users you listed");
                        return res.redirect('back');
                    }

                    for (let user of statusGroup) {
                        creators.push(user);
                    }

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

        const project = await Project.create({title: req.body.title, text: req.body.text, poster: req.user, creators}); //Create a new project with all the provided data
        if (!project) {
            req.flash('error', "Unable to create project");
            return res.redirect('back');
        }

        if (req.body.images) { //If any images were added (if not, the 'images' property is null)
            for (const image in req.body.images) {
                project.images.push(req.body.images[image]);
            }
        }

        if (req.files) {
            if (req.files.imageFile) {
                let cloudErr;
                let cloudResult;
                for (let file of req.files.imageFile) {
                    if ([".mp3", ".mp4", ".m4a"].includes(path.extname(file.originalname).toLowerCase())) {
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

                    project.imageFiles.push({
                        filename: cloudResult.public_id,
                        url: cloudResult.secure_url,
                        originalName: file.originalname
                    });
                }
            }
        }

        project.date = dateFormat(project.created_at, "h:MM TT | mmm d");
        await project.save();

        const followers = await User.find({authenticated: true, _id: {$in: req.user.followers}});
        if (!followers) {
            req.flash('error', "Unable to access your followers");
            return res.redirect('back');
        }

        let notif;
        let imageString = ``;

        for (let image of project.images) {
            imageString += `<img style="width: 50%; height: 50%;" src="${image}"/>`;
        }

        for (let follower of followers) {
            notif = await Notification.create({
                subject: "New Project Post",
                sender: req.user,
                noReply: true,
                recipients: [follower],
                read: [],
                toEveryone: false,
                images: project.images
            }); //Create a notification to alert the user
            if (!notif) {
                req.flash('error', 'Unable to send notification');
                return res.redirect('back');
            }

            notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
            notif.text = `Hello ${follower.firstName},\n\n${req.user.firstName} ${req.user.lastName} recently posted a new project: "${project.title}". Check it out!`;
            await notif.save();
            if (follower.receiving_emails) {
                await sendGridEmail(follower.email, `New Project Post - ${project.title}`, `<p>Hello ${follower.firstName},</p><p>${req.user.firstName} ${req.user.lastName} recently posted a new project: <strong>${project.title}</strong>. Check it out!</p>${imageString}`, false);
            }

            follower.inbox.push(notif); //Add notif to user's inbox
            follower.msgCount += 1;
            await follower.save();

        }

        req.flash('success', "Project Posted!");
        res.redirect(`/projects/${project._id}`);

    })().catch(err => {
        req.flash('error', "An Error Occurred");
        res.redirect('back');
    });
});

//COMMENTED OUT FOR NOW, UNTIL WE MAKE FURTHER DECISIONS AT MEETING

// router.get('/data', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {
//     Project.find({poster: req.user._id}).populate("comments").exec((err, projects) => {;
//         if (err || !projects) {
//             req.flash('error', "Unable to find projects");
//             return res.redirect('back');
//         }
//
//         const popularProjects = sortByPopularity(projects, "likes", "created_at", null).popular; //Extract and sort popular projects
//         const unpopularProjects = sortByPopularity(projects, "likes", "created_at", null).unpopular; //Extract and sort unpopular projects
//
//         //Build string of projects and comments text
//         let popularProjectText = "";
//         let popularCommentText = "";
//         for (let project of popularProjects) {
//             popularProjectText += `${project.title} ${project.text} `;
//             for (let comment of project.comments) {
//                 popularCommentText += `${comment.text} `;
//             }
//         }
//
//         //Build string of projects and comments text
//         let unpopularProjectText = "";
//         let unpopularCommentText = "";
//         for (let project of unpopularProjects) {
//             unpopularProjectText += `${project.title} ${project.text} `;
//             for (let comment of project.comments) {
//                 unpopularCommentText += `${comment.text} `;
//             }
//         }
//
//         //Map keywords from popular projects and their comments
//         const projectKeywords = filter(popularProjectText, unpopularProjectText);
//         const commentKeywords = filter(popularCommentText, unpopularCommentText);
//         res.render('projects/data', {popularProjects, projectKeywords, commentKeywords});
//     });
// });

router.get('/:id/edit', middleware.isLoggedIn, middleware.isFaculty, (req, res) => { //RESTful Routing 'EDIT' route

    (async () => { //Asynchronous functions dictates that processes occur one at a time, reducing excessive callbacks
        const project = await Project.findById(req.params.id).populate('poster').populate('creators'); //Find one project based on id provided in form
        if (!project) {
            req.flash('error', 'Unable to find project');
            res.redirect('back');

        } else if (project.poster._id.toString() != req.user._id.toString()) { //If you didn't post the project, you can't edit it
            req.flash('error', "You may only delete projects that you have posted");
            return res.redirect('back');
        }

        let creatornames = []; //Will store a list of all the project's creators' usernames

        for (let creator of project.creators) { //Add each creator's username to creatornames
            creatornames.push(creator.username);
        }

        const students = await User.find({
            authenticated: true,
            status: {$nin: ['alumnus', 'guest', 'parent', 'faculty']}
        }); //Find all students - all of whom are possible project creators

        if (!students) {
            req.flash('error', 'Unable to find student list');
            return res.redirect('back');
        }

        let fileExtensions = new Map();
        for (let media of project.imageFiles) {
            fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
        }

        res.render('projects/edit', {project, students, creatornames, fileExtensions});

    })().catch(err => {
        req.flash('error', "An Error Occurred");
        res.redirect('back');
    });
});

router.get('/:id', (req, res) => { //RESTful Routing 'SHOW' route

    Project.findById(req.params.id)
        .populate('poster')
        .populate('creators')
        .populate({
            path: "comments",
            populate: {
                path: "sender"
            }
        })
        .exec((err, project) => { //Find the project specified in the form, get info about its poster and creators (part of the User schema)
            if (err || !project) {
                req.flash('error', "An Error Occurred");
                res.redirect('back');

            } else {
                let fileExtensions = new Map();
                for (let media of project.imageFiles) {
                    fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
                }
                const convertedText = convertToLink(project.text);
                res.render('projects/show', {project, convertedText, fileExtensions});
            }
        });
});

router.put('/like', middleware.isLoggedIn, (req, res) => {
    Project.findById(req.body.project, (err, project) => {
        if (err || !project) {
            res.json({error: 'Error updating project'});

        } else {
            if (project.likes.includes(req.user._id)) { //Remove like
                project.likes.splice(project.likes.indexOf(req.user._id), 1);
                project.save();

                res.json({
                    success: `Removed a like from ${project.title}`,
                    likeCount: project.likes.length
                });

            } else { //Add like
                project.likes.push(req.user._id);
                project.save();

                res.json({
                    success: `Liked ${project.title}`,
                    likeCount: project.likes.length
                });
            }
        }
    });
});

router.put('/like-comment', middleware.isLoggedIn, (req, res) => {
    PostComment.findById(req.body.commentId, (err, comment) => {
        if (err || !comment) {
            res.json({error: 'Error updating comment'});

        } else {

            if (comment.likes.includes(req.user._id)) { //Remove Like
                comment.likes.splice(comment.likes.indexOf(req.user._id), 1);
                comment.save();
                res.json({
                    success: `Removed a like from a comment`,
                    likeCount: comment.likes.length
                });

            } else { //Add Like
                comment.likes.push(req.user._id);
                comment.save();

                res.json({
                    success: `Liked comment`,
                    likeCount: comment.likes.length
                });
            }
        }
    });
});

router.put('/comment', middleware.isLoggedIn, (req, res) => {

    (async () => {

        const project = await Project.findById(req.body.project)
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
            text: req.body.text,
            sender: req.user,
            date: dateFormat(new Date(), "h:MM TT | mmm d")
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
        let commentEmail;

        for (let user of users) {

            notif = await Notification.create({
                subject: `New Mention in ${project.title}`,
                sender: req.user,
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
            notif.text = `Hello ${user.firstName},\n\n${req.user.firstName} ${req.user.lastName} mentioned you in a comment on "${project.title}":\n${comment.text}`;

            await notif.save();
            if (user.receiving_emails) {
                await sendGridEmail(user.email, `New Mention in ${project.title}`, `<p>Hello ${user.firstName},</p><p>${req.user.firstName} ${req.user.lastName} mentioned you in a comment on <strong>${project.title}</strong>.<p>${comment.text}</p>`, false);
            }

            user.inbox.push(notif); //Add notif to user's inbox
            user.msgCount += 1;
            await user.save();
        }

        return res.json({
            success: 'Successful comment',
            comments: project.comments
        });

    })().catch(err => {
        res.json({error: "Error Commenting"});
    });
});

router.put('/:id', middleware.isLoggedIn, middleware.isFaculty, multipleUpload, (req, res) => {
    (async () => { //Asynchronous functions dictates that processes occur one at a time, reducing excessive callbacks

        let creators = [];
        let statusGroup; //Group of creators by status
        let individual; //Individual Creator ID

        if (req.body.creatorInput == '') {
            creators = [];

        } else {
            let statuses = ['7th', '8th', '9th', '11th', '12th'];

            let creatorInputArray = req.body.creatorInput.split(',');

            for (let creator of creatorInputArray) {

                if (statuses.includes(creator)) {
                    statusGroup = await User.find({authenticated: true, status: creator});

                    if (!statusGroup) {
                        req.flash('error', "Unable to find the users you listed");
                        return res.redirect('back');
                    }

                    for (let user of statusGroup) {
                        creators.push(user);
                    }

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

        const project = await Project.findById(req.params.id).populate('poster');

        if (!project) {
            req.flash('error', "Unable to find project");
            return res.redirect('back');
        }

        if (project.poster._id.toString() != req.user._id.toString()) {
            req.flash('error', "You may only update projects that you have posted");
            return res.redirect('back');
        }

        const updatedProject = await Project.findByIdAndUpdate(project._id, {
            title: req.body.title,
            creators,
            text: req.body.text
        });

        if (!updatedProject) {
            req.flash('error', "Unable to update project");
            return res.redirect('back');
        }

        updatedProject.images = []; //Empty image array so that you can fill it with whatever images are added (all images are there, not just new ones)
        if (req.body.images) { //Only add images if any are provided
            for (const image in req.body.images) {
                updatedProject.images.push(req.body.images[image]);
            }
        }

        let cloudErr;
        let cloudResult;
        for (let i = updatedProject.imageFiles.length-1; i >= 0; i--) {
            if (req.body[`deleteUpload-${updatedProject.imageFiles[i].url}`] && updatedProject.imageFiles[i] && updatedProject.imageFiles[i].filename) {
                if ([".mp3", ".mp4", ".m4a"].includes(path.extname(updatedProject.imageFiles[i].url.split("SaberChat/")[1]).toLowerCase())) {
                    [cloudErr, cloudResult] = await cloudDelete(updatedProject.imageFiles[i].filename, "video");
                } else if (path.extname(updatedProject.imageFiles[i].url.split("SaberChat/")[1]).toLowerCase() == ".pdf") {
                    [cloudErr, cloudResult] = await cloudDelete(updatedProject.imageFiles[i].filename, "pdf");
                } else {
                    [cloudErr, cloudResult] = await cloudDelete(updatedProject.imageFiles[i].filename, "image");
                }
                // check for failure
                if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                    req.flash('error', 'Error deleting uploaded image');
                    return res.redirect('back');
                }
                updatedProject.imageFiles.splice(i, 1);
            }
        }

        // if files were uploaded
        if (req.files) {
            if (req.files.imageFile) {
                for (let file of req.files.imageFile) {
                    if ([".mp3", ".mp4", ".m4a"].includes(path.extname(file.originalname).toLowerCase())) {
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

                    updatedProject.imageFiles.push({
                        filename: cloudResult.public_id,
                        url: cloudResult.secure_url,
                        originalName: file.originalname
                    });
                }
            }
        }

        await updatedProject.save();
        const followers = await User.find({authenticated: true, _id: {$in: req.user.followers}});
        if (!followers) {
            req.flash('error', "Umable to access your followers");
            return res.redirect('back');
        }

        let notif;
        let imageString = ``;

        for (let image of updatedProject.images) {
            imageString += `<img style="width: 50%; height: 50%;" src="${image}"/>`;
        }

        for (let follower of followers) {

            notif = await Notification.create({
                subject: "New Project Post",
                sender: req.user,
                noReply: true,
                recipients: [follower],
                read: [],
                toEveryone: false,
                images: updatedProject.images
            }); //Create a notification to alert the user

            if (!notif) {
                req.flash('error', 'Unable to send notification');
                return res.redirect('back');
            }

            notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
            notif.text = `Hello ${follower.firstName},\n\n${req.user.firstName} ${req.user.lastName} recently updated one of their projects: "${updatedProject.title}". Check it out!`;
            await notif.save();
            if (follower.receiving_emails) {
                await sendGridEmail(follower.email, `Updated Project Post - ${updatedProject.title}`, `<p>Hello ${follower.firstName},</p><p>${req.user.firstName} ${req.user.lastName} recently updated one of their projects: <strong>${updatedProject.title}</strong>. Check it out!</p>${imageString}`, false);
            }

            follower.inbox.push(notif); //Add notif to user's inbox
            follower.msgCount += 1;
            await follower.save();
        }

        req.flash("success", "Project Updated!");
        return res.redirect(`/projects/${project._id}`);

    })().catch(err => {
        req.flash('error', "An Error Occurred");
        res.redirect('back');
    });
});

router.delete('/:id', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {

    (async () => { //Asynchronous functions dictates that processes occur one at a time, reducing excessive callbacks
        const project = await Project.findById(req.params.id);

        if (!project) {
            req.flash('error', "Unable to access project");
            return res.redirect('back');

        } else if (project.poster._id.toString() != req.user._id.toString()) { //If you didn't post the project, you can't delete it
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
        for (let file of project.imageFiles) {
            if (file && file.filename) {
                if ([".mp3", ".mp4", ".m4a"].includes(path.extname(file.url.split("SaberChat/")[1]).toLowerCase())) {
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

    })().catch(err => {
        req.flash('error', "An Error Occurred");
        res.redirect('back');
    });
});

module.exports = router;
