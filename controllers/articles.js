//LIBRARIES
const {convertToLink, embedLink} = require("../utils/convert-to-link");
const {sendGridEmail} = require("../services/sendGrid");
const dateFormat = require('dateformat');
const path = require('path');
const {objectArrIndex, removeIfIncluded, parsePropertyArray} = require("../utils/object-operations");
const setup = require("../utils/setup");
const {cloudUpload, cloudDelete} = require('../services/cloudinary');
const {autoCompress} = require("../utils/image-compress");

//SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const {ArticleLink, PostComment} = require('../models/post');

const controller = {};

// Article GET index
controller.index = async function(req, res) {
    const platform = await setup(Platform);
    const users = await User.find({authenticated: true}); // Fetch all users
    let articles;
    if (req.user && await platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission)) {
        // Fetch all articles
        articles = await ArticleLink.find({}).populate('sender');
    } else {
        // If the platform has post verification enabled, only fetch verified articles
        articles = await ArticleLink.find({verified: true}).populate('sender');
    }

    if(!platform || !users || !articles) { // Catch-all redirect
        await req.flash('error', 'Cannot find articles.');
        return res.redirect('back');
    }

    // Format a string of names for all users of the site
    const userNames = await parsePropertyArray(users, "firstName").join(',').toLowerCase().split(',');
    const articleTexts = await embedLink(req.user, articles, userNames);

    return res.render('articles/index', { // Send data to frontend
        platform, articles: await articles.reverse(), articleTexts,
        data: platform.features[await objectArrIndex(platform.features, "route", "articles")]
    });
};

// Article GET new article
controller.new = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    // Render the article creation page
    return res.render('articles/new', {platform, data: platform.features[await objectArrIndex(platform.features, "route", "articles")]});
};

// Article GET show
controller.show = async function(req, res) {
    const platform = await setup(Platform);
    const article = await ArticleLink.findById(req.params.id) // Fetch relevant article
        .populate('sender') // Fill in authoer information
        .populate({ // Fill in comment information
            path: "comments",
            populate: {path: "sender"}
        });
    if(!platform || !article) { // Redirect if article is not found
        await req.flash('error', 'Could not find article'); return res.redirect('back');
    } else if (!article.verified && !(await platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission))) {
        // If the article is not verified, don't let the user view it
        await req.flash('error', 'You cannot view that article');
        return res.redirect('back');
    }

    // Handle file extensions
    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of article.mediaFiles) {
        await fileExtensions.set(media.url, await path.extname(await media.url.split("SaberChat/")[1]));
    }
    const convertedText = await convertToLink(article.text); //Parse and add hrefs to all links in text

    // Redirect and send data to frontend
    return res.render('articles/show', {platform, article, convertedText, fileExtensions, data: platform.features[await objectArrIndex(platform.features, "route", "articles")]});
};

// Article GET edit form
controller.updateForm = async function(req, res) {
    const platform = await setup(Platform);
    const article = await ArticleLink.findById(req.params.id); // Find relevant article
    if(!platform || !article) { // If article is not found, redirect user
        await req.flash('error', 'Could not find article');
        return res.redirect('back');
    }
    if(!(await article.sender._id.equals(req.user._id))) {
        // If the user did not post that article, don't let them edit
        await req.flash('error', 'You do not have permission to do that.');
        return res.redirect('back');
    }

    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of article.mediaFiles) {
        await fileExtensions.set(media.url, await path.extname(await media.url.split("SaberChat/")[1]));
    }

    // Redirect to edit page
    return res.render('articles/edit', {platform, article, fileExtensions, data: platform.features[await objectArrIndex(platform.features, "route", "articles")]});
};

// Article POST create
controller.create = async function(req, res) {
    const platform = await setup(Platform);
    const article = await ArticleLink.create({ //Build article with error info
        sender: req.user, // Current user
        subject: req.body.subject, // Article title
        text: req.body.message, // Article body
        verified: !platform.postVerifiable //Article does not need to be verified if platform does not support verifying articles
    });
    if (!platform || !article) { // Error
        await req.flash('error', 'Unable to create article');
        return res.redirect('back');
    }

    //Add images and links
    for (let attr of ["images", "links"]) {if (req.body[attr]) {article[attr] = req.body[attr];}}

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

                await article.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }

    article.date = await dateFormat(article.created_at, "h:MM TT | mmm d");
    await article.save();

    if (platform.postVerifiable) { // Different message based on whether the platform has verification or not
        await req.flash('success', `Article Posted! A platform ${await platform.permissionsDisplay[platform.permissionsDisplay.length-1].toLowerCase()} will verify your post soon.`);
    } else {
        await req.flash('success', `Article Posted!`);
    }
    return res.redirect(`/articles`);
};

controller.verify = async function(req, res) {
    // Find relevant article and update the verification to true
    const article = await ArticleLink.findByIdAndUpdate(req.params.id, {verified: true});
    if (!article) { // Redirect if article cannot be found
        await req.flash('error', "Unable to access article");
        return res.redirect('back');
    }

    await req.flash("success", "Verified Article!");
    return res.redirect("/articles");
}

controller.updateArticle = async function(req, res) {
    const platform = await setup(Platform);
    // Find relevant article
    const article = await ArticleLink.findById(req.params.id).populate('sender');
    if (!platform || !article) { // Redirect if article was not found
        await req.flash('error', "Unable to access article");
        return res.redirect('back');
    }

    // Check if current user is the author of the article. If not, don't allow edit
    if ((await article.sender._id.toString()) != (await req.user._id.toString())) {
        await req.flash('error', "You can only update articles which you have sent");
        return res.redirect('back');
    }

    // Update article with new information
    const updatedArticle = await ArticleLink.findByIdAndUpdate(req.params.id, {
        subject: req.body.subject, // Article title
        text: req.body.message, // Article body
        verified: !platform.postVerifiable //Article does not need to be verified if platform does not support verifying articles
    });
    if (!updatedArticle) { // Redirect if there was an error updating
        await req.flash('error', "Unable to update article");
        return res.redirect('back');
    }
    // Set article media
    for (let attr of ["images", "links"]) {if (req.body[attr]) {updatedArticle[attr] = req.body[attr];}}

    //Iterate through all selected media to remove and delete them
    let cloudErr;
    let cloudResult;
    for (let i = updatedArticle.mediaFiles.length-1; i >= 0; i--) {
        if (req.body[`deleteUpload-${updatedArticle.mediaFiles[i].url}`] && updatedArticle.mediaFiles[i] && updatedArticle.mediaFiles[i].filename) {
            //Evaluate filetype to decide on file deletion strategy
            switch(await path.extname(await updatedArticle.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase()) {
                case ".mp3":
                case ".mp4":
                case ".m4a":
                case ".mov":
                    [cloudErr, cloudResult] = await cloudDelete(updatedArticle.mediaFiles[i].filename, "video");
                    break;
                case ".pdf":
                    [cloudErr, cloudResult] = await cloudDelete(updatedArticle.mediaFiles[i].filename, "pdf");
                    break;
                default:
                    [cloudErr, cloudResult] = await cloudDelete(updatedArticle.mediaFiles[i].filename, "image");
            }

            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') { // Check for Failure
                await req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
            await updatedArticle.mediaFiles.splice(i, 1);
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

                await updatedArticle.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }
    
    await updatedArticle.save();
    await req.flash('success', 'Article Updated!');
    return res.redirect(`/articles`);
}

// Article PUT like article
controller.likeArticle = async function(req, res) {
    // Find relevant article
    const article = await ArticleLink.findById(req.body.articleId);

    if(!article) {return res.json({error: 'Error updating article.'});}

    if (await removeIfIncluded(article.likes, req.user._id)) { //Remove like
        await article.save();
        return res.json({
            success: `Removed a like from ${article.subject}`,
            likeCount: article.likes.length
        });
    }

    await article.likes.push(req.user._id); //Add likes to article
    await article.save();
    return res.json({
        success: `Liked ${article.subject}`,
        likeCount: article.likes.length
    });
};

// Article PUT comment
controller.comment = async function(req, res) {
    const article = await ArticleLink.findById(req.body.articleId) // Find relevant article
        .populate({
            path: "comments", // Fill in comment information
            populate: {path: "sender"} // Fill in author information
        });
    if (!article) {
        return res.json({
            error: 'Error commenting' // Let the frontend know that there was an error
        });
    }

    const comment = await PostComment.create({ // Create new comment object
        text: await req.body.text.split('<').join('&lt'), // Comment body
        sender: req.user // Comment author
    });
    if (!comment) {return res.json({error: 'Error commenting'});}

    comment.date = await dateFormat(comment.created_at, "h:MM TT | mmm d"); // Date of comment
    await comment.save();

    await article.comments.push(comment); // Save the comment under the relevant article
    await article.save();

    let users = [];
    let user;
    //Search for any mentioned users
    for (let line of await comment.text.split(" ")) {
        if (line[0] == '@') {
            user = await User.findById(line.split("#")[1].split("_")[0]);
            if (!user) {return res.json({error: "Error accessing user"});}
            await users.push(user);
        }
    }

    return res.json({ // Send success information to frontend
        success: 'Successful comment',
        comments: article.comments
    });
}

// Article PUT like comment
controller.likeComment = async function(req, res) {
    // Find relevant comment
    const comment = await PostComment.findById(req.body.commentId);
    if(!comment) {return res.json({error: 'Error finding comment'});}

    if (await removeIfIncluded(comment.likes, req.user._id)) { //Remove Like
        await comment.save();
        return res.json({ // Send information to frontend
            success: `Removed a like`,
            likeCount: comment.likes.length
        });
    }

    await comment.likes.push(req.user._id); //Add Like
    await comment.save();
    return res.json({ // Send information to frontend
        success: `Liked comment`,
        likeCount: comment.likes.length
    });
}

controller.deleteArticle = async function(req, res) {
    // Find relevant article
    const article = await ArticleLink.findById(req.params.id).populate('sender');
    if (!article) {
        await req.flash('error', "Unable to access article");
        return res.redirect('back');
    }

    if ((await article.sender._id.toString()) != await (req.user._id.toString())) { //Doublecheck that deleter is articleer
        await req.flash('error', "You can only delete articles that you have posted");
        return res.redirect('back');
    }

    // delete any uploads
    let cloudErr;
    let cloudResult;
    for (let file of article.mediaFiles) {
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

             if (cloudErr || !cloudResult || cloudResult.result !== 'ok') { // Check For Failure
                await req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
        }
    }

    // Delete the article
    const deletedArticle = await ArticleLink.findByIdAndDelete(article._id);
    
    if (!deletedArticle) {
        await req.flash('error', "Unable to delete article");
        return res.redirect('back');
    }

    await req.flash('success', 'Article Deleted!');
    return res.redirect('/articles/');
}

controller.specificInfo = async function(req, res) {
    const platform = await setup(Platform);
    // render specific info page
    return res.render('other/specific-info', {platform, description: platform.features[await objectArrIndex(platform.features, "route", "articles/specific-info")].description});
}

controller.donate = async function(req, res) {
    const platform = await setup(Platform);
    // render donate page
    return res.render('other/donate', {platform, description: platform.features[await objectArrIndex(platform.features, "route", "articles/donate")].description, objectArrIndex});
}

controller.advice = async function(req, res) {
    const platform = await setup(Platform);
    if (platform.originalEmail != '') {
        // File setup
        let images = [];
        let pdfs = [];
        let text = req.body.message;

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
                    if (await [".png", ".jpg"].includes(await path.extname(await cloudResult.url.split("SaberChat/")[1]))) {
                        await images.push(cloudResult.url);
                    }
                    else {
                        await pdfs.push({url: cloudResult.secure_url, name: file.originalname});
                    }
                }
            }
        }

        //Send emails to all users
        for (let file of images) {text += `<br><img src="${file}" style="width: 50%; height: 50%;>`;}
        for (let file of pdfs) {text += `<iframe src="${file.url}" height="300" width="250"></iframe><a href="${file.url}" target="_blank"><h5>Open ${file.originalname} New Tab?</h5></a>`;}
        await sendGridEmail(platform.officialEmail, `New Advice Donation From ${req.user.firstName} ${req.user.lastName} - ${req.body.subject}`, text, false);
        await req.flash("success", "Thank you for sending us your advice!");
        return res.redirect("/articles/donate");
    }
    await req.flash("error", `${platform.name} Saberchat does not have an official email set up yet`);
    return res.redirect("back");
}

module.exports = controller;