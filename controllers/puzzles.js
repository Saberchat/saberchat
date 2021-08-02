//LIBRARIES
const {sendGridEmail} = require("../services/sendGrid");
const {convertToLink, embedLink} = require("../utils/convert-to-link");
const {objectArrIndex, removeIfIncluded, parsePropertyArray} = require("../utils/object-operations");
const setup = require("../utils/setup");
const path = require('path');
const dateFormat = require('dateformat');
const {cloudUpload, cloudDelete} = require('../services/cloudinary');
const {autoCompress} = require("../utils/image-compress");

//SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const {Puzzle, PostComment} = require('../models/post');
const {InboxMessage} = require('../models/notification');

const controller = {};

// Puzzle GET index
controller.index = async function(req, res) {
    const platform = await setup(Platform);
    const users = await User.find({authenticated: true});
    if (!platform || !users) {
        await req.flash('error', 'An Error Occurred');
        return res.redirect('back');
    }

    let puzzles;
    if (await platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission)) {
        puzzles = await Puzzle.find({}).populate('sender').populate("answers");
    } else {
        puzzles = await Puzzle.find({verified: true}).populate('sender').populate("answers");;
    }
    if(!puzzles) {
        await req.flash('error', 'Cannot find puzzles.');
        return res.redirect('back');
    }

    const userNames = await parsePropertyArray(users, "firstName").join(',').toLowerCase().split(',');
    const puzzleTexts = await embedLink(req.user, puzzles, userNames);
    const answeredPuzzles = new Map();

    for (let puzzle of puzzles) {
        if (objectArrIndex(puzzle.answers, "sender", req.user._id) > -1) {
            answeredPuzzles.set(puzzle._id, answer.text);
        }
    }

    return res.render('puzzles/index', {
        platform, puzzles: await puzzles.reverse(), puzzleTexts,
        data: platform.features[await objectArrIndex(platform.features, "route", "puzzles")]
    });
};

// Puzzle GET new ann
controller.new = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An Error Occurred");
        return res.redirect("back");
    }
    return res.render('puzzles/new', {platform, data: platform.features[await objectArrIndex(platform.features, "route", "puzzles")]});
};

// Puzzle GET show
controller.show = async function(req, res) {
    const platform = await setup(Platform);
    const puzzle = await Puzzle.findById(req.params.id)
        .populate('sender')
        .populate({
            path: "comments",
            populate: {path: "sender"}
        })
        .populate({
            path: "answers",
            populate: {path: "sender"}
        });
    if(!platform || !puzzle) {
        await req.flash('error', 'Could not find puzzle');
        return res.redirect('back');

    } else if (!puzzle.verified && !(await platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission))) {
        await req.flash('error', 'You cannot view that puzzle');
        return res.redirect('back');
    }

    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of puzzle.mediaFiles) {
        await fileExtensions.set(media.url, await path.extname(media.url.split("SaberChat/")[1]));
    }
    const convertedText = await convertToLink(puzzle.text); //Parse and add hrefs to all links in text
    return res.render('puzzles/show', {
        platform, puzzle, convertedText, fileExtensions,
        data: platform.features[await objectArrIndex(platform.features, "route", "puzzles")]
    });
};

// Puzzle GET edit form
controller.updateForm = async function(req, res) {
    const platform = await setup(Platform);
    const puzzle = await Puzzle.findById(req.params.id);
    if(!platform || !puzzle) {
        await req.flash('error', 'Could not find puzzle');
        return res.redirect('back');
    }
    if(!(await puzzle.sender.equals(req.user._id))) { //Only the sender may edit the puzzle
        await req.flash('error', 'You do not have permission to do that.');
        return res.redirect('back');
    }

    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of puzzle.mediaFiles) {
        await fileExtensions.set(media.url, await path.extname(await media.url.split("SaberChat/")[1]));
    }
    return res.render('puzzles/edit', {platform, puzzle, fileExtensions});
};

// Puzzle POST create
controller.create = async function(req, res) {
    const platform = await setup(Platform);
    const puzzle = await Puzzle.create({
        sender: req.user,
        subject: req.body.subject,
        text: req.body.message,
        solution: req.body.solution,
        verified: !platform.postVerifiable //Puzzle does not need to be verified if platform does not support verifying puzzles
    });
    if (!platform || !puzzle) {
        await req.flash('error', 'Unable to create puzzle');
        return res.redirect('back');
    }

    if (req.body.images) {puzzle.images = req.body.images;} //If any images were added (if not, the 'images' property is empty)

    // if files were uploaded, process them
    if (req.files) {
        if (req.files.mediaFile) {
            let cloudErr;
            let cloudResult;
            for (let file of req.files.mediaFile) { //Upload each file to cloudinary
                const processedBuffer = await autoCompress(file.originalname, file.buffer);
                [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
                if (cloudErr || !cloudResult) {
                    await req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }

                await puzzle.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }

    puzzle.date = dateFormat(puzzle.created_at, "h:MM TT | mmm d");
    await puzzle.save();

    if (!platform.postVerifiable) {
        const users = await User.find({authenticated: true, _id: {$ne: req.user._id}});
        if (!users) {
            await req.flash('error', "An Error Occurred");
            return res.redirect('back');
        }

        let imageString = ""; //Build string of all attached images
        for (const image of puzzle.images) {imageString += `<img src="${image}">`;}
        for (let user of users) { //Send email to all users
            if (user.receiving_emails) {
                const emailText = `<p>Hello ${user.firstName},</p><p>${req.user.username} has recently posted a new puzzle - '${puzzle.subject}'.</p><p>${puzzle.text}</p><p>You can access the full puzzle at https://${platform.url}</p> ${imageString}`;
                await sendGridEmail(user.email, `New Saberchat Puzzle - ${puzzle.subject}`, emailText, false);
                await user.save();
            }
        }
    }

    if (platform.postVerifiable) {
        await req.flash('success', `Puzzle Posted! A platform ${await platform.permissionsDisplay[platform.permissionsDisplay.length-1].toLowerCase()} will verify your post soon.`);
    } else {
        await req.flash('success', `Puzzle Posted!`);
    }
    return res.redirect(`/puzzles`);
};

controller.verify = async function(req, res) {
    const platform = await setup(Platform);
    const puzzle = await Puzzle.findByIdAndUpdate(req.params.id, {verified: true}).populate("sender");
    if (!platform || !puzzle) {
        await req.flash('error', "Unable to access puzzle");
        return res.redirect('back');
    }

    if (platform.postVerifiable) {
        const users = await User.find({authenticated: true, _id: {$ne: req.user._id}});
        if (!users) {
            await req.flash('error', "An Error Occurred");
            return res.redirect('back');
        }

        let imageString = ""; //Build string of all attached images
        for (const image of puzzle.images) {imageString += `<img src="${image}">`;}
        for (let user of users) { //Send email to all users
            if (user.receiving_emails) {
                const emailText = `<p>Hello ${user.firstName},</p><p>${puzzle.sender.username} has recently posted a new puzzle - '${puzzle.subject}'.</p><p>${puzzle.text}</p><p>You can access the full puzzle at https://${platform.url}</p> ${imageString}`;
                await sendGridEmail(user.email, `New Saberchat Puzzle - ${puzzle.subject}`, emailText, false);
                await user.save();
            }
        }
    }

    await req.flash("success", "Verified Puzzle!");
    return res.redirect("/puzzles");
}

//Puzzle PUT Update
controller.updatePuzzle = async function(req, res) {
    const platform = await setup(Platform);
    const puzzle = await Puzzle.findById(req.params.id).populate('sender');
    if (!platform || !puzzle) {
        await req.flash('error', "Unable to access puzzle");
        return res.redirect('back');
    }

    if ((await puzzle.sender._id.toString()) != (await req.user._id.toString())) {
        await req.flash('error', "You can only update puzzles which you have sent");
        return res.redirect('back');
    }

    const updatedPuzzle = await Puzzle.findByIdAndUpdate(req.params.id, {
        subject: req.body.subject,
        text: req.body.message,
        solution: req.body.solution,
        verified: !platform.postVerifiable //Puzzle does not need to be verified if platform does not support verifying puzzles
    });
    if (!updatedPuzzle) {
        await req.flash('error', "Unable to update puzzle");
        return res.redirect('back');
    }

    if (req.body.images) {updatedPuzzle.images = req.body.images;} //Only add images if any are provided

    //Iterate through all selected media to remove and delete them
    let cloudErr;
    let cloudResult;
    for (let i = updatedPuzzle.mediaFiles.length-1; i >= 0; i--) {
        if (req.body[`deleteUpload-${updatedPuzzle.mediaFiles[i].url}`] && updatedPuzzle.mediaFiles[i] && updatedPuzzle.mediaFiles[i].filename) {
            //Evaluate filetype to decide on file deletion strategy
            switch(await path.extname(await updatedPuzzle.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase()) {
                case ".mp3":
                case ".mp4":
                case ".m4a":
                case ".mov":
                    [cloudErr, cloudResult] = await cloudDelete(updatedPuzzle.mediaFiles[i].filename, "video");
                    break;
                case ".pdf":
                    [cloudErr, cloudResult] = await cloudDelete(updatedPuzzle.mediaFiles[i].filename, "pdf");
                    break;
                default:
                    [cloudErr, cloudResult] = await cloudDelete(updatedPuzzle.mediaFiles[i].filename, "image");
            }

            // Check For Failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                await req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
            await updatedPuzzle.mediaFiles.splice(i, 1);
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
                    await req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }

                await updatedPuzzle.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }

    await updatedPuzzle.save();
    const users = await User.find({authenticated: true, _id: {$ne: req.user._id}});
    if (!users) {
        await req.flash('error', "An Error Occurred");
        return res.redirect('back');
    }

    let imageString = "";
    for (let image of puzzle.images) {imageString += `<img src="${image}">`;}

    await req.flash('success', 'Puzzle Updated!');
    return res.redirect(`/puzzles`);
}

// Puzzle PUT like ann
controller.likePuzzle = async function(req, res) {
    const puzzle = await Puzzle.findById(req.body.puzzleId);
    if(!puzzle) {return res.json({error: 'Error updating puzzle.'});}

    if (await removeIfIncluded(puzzle.likes, req.user._id)) { //Remove like
        await puzzle.save();
        return res.json({
            success: `Removed a like from ${puzzle.subject}`,
            likeCount: puzzle.likes.length
        });
    }
    
    await puzzle.likes.push(req.user._id);
    await puzzle.save();
    return res.json({
        success: `Liked ${puzzle.subject}`,
        likeCount: puzzle.likes.length
    });
};

// Puzzle PUT comment
controller.comment = async function(req, res) {
    const puzzle = await Puzzle.findById(req.body.puzzleId)
        .populate({
            path: "comments",
            populate: {path: "sender"}
        });
    if (!puzzle) {return res.json({error: 'Error commenting'});}

    const comment = await PostComment.create({
        text: await req.body.text.split('<').join('&lt'),
        sender: req.user
    });
    if (!comment) {return res.json({error: 'Error commenting'});}

    comment.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
    await comment.save();

    await puzzle.comments.push(comment);
    await puzzle.save();

    let users = [];
    let user;
    for (let line of await comment.text.split(" ")) {
        if (line[0] == '@') {
            user = await User.findById(await line.split("#")[1].split("_")[0]);
            if (!user) {return res.json({error: "Error accessing user"});}
            await users.push(user);
        }
    }

    let notif;
    for (let user of users) {
        notif = await InboxMessage.create({
            subject: `New Mention in ${puzzle.subject}`,
            author: req.user,
            noReply: true,
            recipients: [user],
            read: [],
            toEveryone: false,
            images: []
        });
        if (!notif) {return res.json({error: "Error creating notification"});}

        notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
        notif.text = `Hello ${user.firstName},\n\n${req.user.firstName} ${req.user.lastName} mentioned you in a comment on "${puzzle.subject}":\n${comment.text}`;
        await notif.save();

        if (user.receiving_emails) {
            await sendGridEmail(user.email, `New Mention in ${puzzle.subject}`, `<p>Hello ${user.firstName},</p><p>${req.user.firstName} ${req.user.lastName} mentioned you in a comment on <strong>${puzzle.subject}</strong>.<p>${comment.text}</p>`, false);
        }

        await user.inbox.push({message: notif, new: true}); //Add notif to user's inbox
        await user.save();
    }

    return res.json({
        success: 'Successful comment',
        comments: puzzle.comments
    });
}

// Puzzle PUT answer
controller.answer = async function(req, res) {
    const puzzle = await Puzzle.findById(req.params.id).populate("answers");
    if (!puzzle) {
        await req.flash("error", "Unable to post answer");
        return res.redirect("back");
    }

    if (objectArrIndex(puzzle.answers, "sender", req.user._id) > -1) {
        await req.flash("error", "You have already answered this post");
        return res.redirect("back");
    }

    const answer = await PostComment.create({
        text: await req.body.answer.split('<').join('&lt'),
        sender: req.user
    });
    if (!answer) {
        await req.flash("error", "Unable to post answer");
        return res.redirect("back");
    }

    answer.date = dateFormat(answer.created_at, "h:MM TT | mmm d");
    await answer.save();

    await puzzle.answers.push(answer);
    await puzzle.save();

    await req.flash("Successfully posted answer!")
    return res.redirect("/puzzles");
}
 
// Puzzle PUT like comment
controller.likeComment = async function(req, res) {
    const comment = await PostComment.findById(req.body.commentId);
    if(!comment) {return res.json({error: 'Error finding comment'});}

    if (await removeIfIncluded(comment.likes, req.user._id)) {
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

controller.deletePuzzle = async function(req, res) {
    const puzzle = await Puzzle.findById(req.params.id).populate('sender');
    if (!puzzle) {
        await req.flash('error', "Unable to access puzzle");
        return res.redirect('back');
    }

    if ((await puzzle.sender._id.toString()) != (await req.user._id.toString())) {
        await req.flash('error', "You can only delete puzzles that you have posted");
        return res.redirect('back');
    }
    
    // delete any uploads
    let cloudErr;
    let cloudResult;
    for (let file of puzzle.mediaFiles) {
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

            // check for failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
                await req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
        }
    }

    const deletedPuzzle = await Puzzle.findByIdAndDelete(puzzle._id);
    if (!deletedPuzzle) {
        await req.flash('error', "Unable to delete puzzle");
        return res.redirect('back');
    }

    const users = await User.find({authenticated: true});
    if (!users) {
        await req.flash('error', "Unable to find users");
        return res.redirect('back');
    }

    await req.flash('success', 'Puzzle Deleted!');
    return res.redirect('/puzzles');
}

module.exports = controller;