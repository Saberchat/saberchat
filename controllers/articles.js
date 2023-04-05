//LIBRARIES
const {convertToLink, embedLink} = require("../utils/convert-to-link"); // string processing
const {sendGridEmail} = require("../services/sendGrid"); // email service
const dateFormat = require('dateformat'); // date formatting
const path = require('path');
// object utilities
const {objectArrIndex, removeIfIncluded, parsePropertyArray} = require("../utils/object-operations");
const setup = require("../utils/setup");
const {cloudUpload, cloudDelete} = require('../services/cloudinary'); // media uploading
const {autoCompress} = require("../utils/image-compress"); // media compression

//SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const {ArticleLink, PostComment} = require('../models/post');

const controller = {}; // initialize controller

// GET: Article index
controller.index = async function(req, res) {
    const platform = await setup(Platform);
    const users = await User.find({authenticated: true});
    let articles;
    // check if user has access to unverified articles
    if (req.user && await platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission)) {
        articles = await ArticleLink.find({}).populate('sender');
    } else {
        articles = await ArticleLink.find({verified: true}).populate('sender');
    }

    if(!platform || !users || !articles) {
        req.flash('error', 'Cannot find articles.');
        return res.redirect('back');
    }

    const userNames = parsePropertyArray(users, "firstName").join(',').toLowerCase().split(',');
    const articleTexts = await embedLink(req.user, articles, userNames);

    return res.render('articles/index', {
        platform, articles: await articles.reverse(), articleTexts,
        data: platform.features[objectArrIndex(platform.features, "route", "articles")]
    });
};

// GET: new article form
controller.new = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    return res.render('articles/new', {platform, data: platform.features[objectArrIndex(platform.features, "route", "articles")]});
};

// GET: Article show
controller.show = async function(req, res) {
    const platform = await setup(Platform);
    // get article by id
    const article = await ArticleLink.findById(req.params.id)
        .populate('sender')
        .populate({
            path: "comments",
            populate: {path: "sender"}
        });
    if(!platform || !article) {
        req.flash('error', 'Could not find article'); return res.redirect('back');
    // check if user has permissions to view article if article is unverified
    } else if (!article.verified && !(await platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission))) {
        req.flash('error', 'You cannot view that article');
        return res.redirect('back');
    }

    let fileExtensions = new Map(); // Track which file format each attachment is in
    for (let media of article.mediaFiles) {
        fileExtensions.set(media.url, path.extname(await media.url.split("SaberChat/")[1]));
    }
    const convertedText = await convertToLink(article.text); // Parse and add hrefs to all links in text
    return res.render('articles/show', {platform, article, convertedText, fileExtensions, data: platform.features[objectArrIndex(platform.features, "route", "articles")]});
};

// GET: Article edit form
controller.updateForm = async function(req, res) {
    const platform = await setup(Platform);
    const article = await ArticleLink.findById(req.params.id);
    if(!platform || !article) {
        req.flash('error', 'Could not find article');
        return res.redirect('back');
    }
    // check if user is article author
    if(!(await article.sender._id.equals(req.user._id))) {
        req.flash('error', 'You do not have permission to do that.');
        return res.redirect('back');
    }

    let fileExtensions = new Map(); // Track which file format each attachment is in
    for (let media of article.mediaFiles) {
        fileExtensions.set(media.url, path.extname(await media.url.split("SaberChat/")[1]));
    }
    return res.render('articles/edit', {platform, article, fileExtensions, data: platform.features[objectArrIndex(platform.features, "route", "articles")]});
};

// POST: Article create
controller.create = async function(req, res) {
    const platform = await setup(Platform);
    const article = await ArticleLink.create({ // Build article with request body info
        sender: req.user,
        subject: req.body.subject,
        text: req.body.message,
        // Article does not need to be verified if platform 
        // does not support verifying articles.
        verified: !platform.postVerifiable
    });
    if (!platform || !article) {
        req.flash('error', 'Unable to create article');
        return res.redirect('back');
    }
    // Add images and links
    for (let attr of ["images", "links"]) {if (req.body[attr]) {article[attr] = req.body[attr];}}

    // if files were uploaded, process them
    if (req.files) {
        if (req.files.mediaFile) {
            let cloudErr;
            let cloudResult;
            for (let file of req.files.mediaFile) { // Upload each file to cloudinary
                // attempt to compress media
                const processedBuffer = await autoCompress(file.originalname, file.buffer);
                // upload to Cloudinary
                [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
                if (cloudErr || !cloudResult) {
                    req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }
                // add uploads to database record
                await article.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }
    // get pre-formatted date for display purposes
    article.date = dateFormat(article.created_at, "h:MM TT | mmm d");
    await article.save();

    // send extra message if article requires verification.
    if (platform.postVerifiable) {
        req.flash('success', `Article Posted! A platform ${await platform.permissionsDisplay[platform.permissionsDisplay.length-1].toLowerCase()} will verify your post soon.`);
    } else {
        req.flash('success', `Article Posted!`);
    }
    return res.redirect(`/articles`);
};

// GET: verify article
controller.verify = async function(req, res) {
    // find article and set to verified
    const article = await ArticleLink.findByIdAndUpdate(req.params.id, {verified: true});
    if (!article) {
        req.flash('error', "Unable to access article");
        return res.redirect('back');
    }

    req.flash("success", "Verified Article!");
    return res.redirect("/articles");
}

// PUT: Article edit
controller.updateArticle = async function(req, res) {
    const platform = await setup(Platform);
    const article = await ArticleLink.findById(req.params.id).populate('sender');
    if (!platform || !article) {
        req.flash('error', "Unable to access article");
        return res.redirect('back');
    }
    // check user to see if article author
    if(!(await article.sender._id.equals(req.user._id))) {
        req.flash('error', "You can only update articles which you have sent");
        return res.redirect('back');
    }
    // update article with request body information
    const updatedArticle = await ArticleLink.findByIdAndUpdate(req.params.id, {
        subject: req.body.subject,
        text: req.body.message,
        // Article does not need to be verified if platform 
        // does not support verifying articles.
        verified: !platform.postVerifiable 
    });
    if (!updatedArticle) {
        req.flash('error', "Unable to update article");
        return res.redirect('back');
    }

    for (let attr of ["images", "links"]) {if (req.body[attr]) {updatedArticle[attr] = req.body[attr];}}

    // Iterate through all selected media to remove and delete them
    let cloudErr;
    let cloudResult;
    for (let i = updatedArticle.mediaFiles.length-1; i >= 0; i--) {
        if (req.body[`deleteUpload-${updatedArticle.mediaFiles[i].url}`] && updatedArticle.mediaFiles[i] && updatedArticle.mediaFiles[i].filename) {
            // Evaluate filetype to decide on file deletion strategy
            switch(path.extname(await updatedArticle.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase()) {
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
                req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
            await updatedArticle.mediaFiles.splice(i, 1);
        }
    }

    // if files were uploaded
    if (req.files) {
        if (req.files.mediaFile) {
            // Iterate through all new attached media
            for (let file of req.files.mediaFile) {
                // attempt to compress media
                const processedBuffer = await autoCompress(file.originalname, file.buffer);
                // upload to Cloudinary
                [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
                if (cloudErr || !cloudResult) {
                    req.flash('error', 'Upload failed');
                    return res.redirect('back');
                }
                // add upload to database record
                await updatedArticle.mediaFiles.push({
                    filename: cloudResult.public_id,
                    url: cloudResult.secure_url,
                    originalName: file.originalname
                });
            }
        }
    }
    // save updates
    await updatedArticle.save();
    req.flash('success', 'Article Updated!');
    return res.redirect(`/articles`);
}

// PUT: Like Article
controller.likeArticle = async function(req, res) {
    const article = await ArticleLink.findById(req.body.articleId);
    if(!article) {return res.json({error: 'Error updating article.'});}

    // Remove like if already liked by user
    if (removeIfIncluded(article.likes, req.user._id)) { 
        await article.save();
        return res.json({ // send json to frontend
            success: `Removed a like from ${article.subject}`,
            likeCount: article.likes.length
        });
    }
    // else add like to article
    await article.likes.push(req.user._id);
    await article.save();
    return res.json({ // send json to frontend
        success: `Liked ${article.subject}`,
        likeCount: article.likes.length
    });
};

// PUT: Article comment
controller.comment = async function(req, res) {
    const article = await ArticleLink.findById(req.body.articleId)
        .populate({
            path: "comments",
            populate: {path: "sender"}
        });
    if (!article) {
        return res.json({
            error: 'Error commenting'
        });
    }

    const comment = await PostComment.create({
        text: await req.body.text.split('<').join('&lt'),
        sender: req.user
    });
    if (!comment) {return res.json({error: 'Error commenting'});}

    // get pre-formatted date for display purposes
    comment.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
    await comment.save();

    await article.comments.push(comment);
    await article.save();

    let users = [];
    let user;
    // Search for any mentioned users
    for (let line of await comment.text.split(" ")) {
        if (line[0] == '@') {
            user = await User.findById(line.split("#")[1].split("_")[0]);
            if (!user) {return res.json({error: "Error accessing user"});}
            await users.push(user);
        }
    }

    return res.json({ // send json to frontend
        success: 'Successful comment',
        comments: article.comments
    });
}

// PUT: Article like comment
controller.likeComment = async function(req, res) {
    const comment = await PostComment.findById(req.body.commentId);
    if(!comment) {return res.json({error: 'Error finding comment'});}

    // Remove like if already liked by user
    if (removeIfIncluded(comment.likes, req.user._id)) {
        await comment.save();
        return res.json({
            success: `Removed a like`,
            likeCount: comment.likes.length
        });
    }
    // Else add like
    await comment.likes.push(req.user._id);
    await comment.save();
    return res.json({
        success: `Liked comment`,
        likeCount: comment.likes.length
    });
}

// DELETE: Delete Article
controller.deleteArticle = async function(req, res) {
    const article = await ArticleLink.findById(req.params.id).populate('sender');
    if (!article) {
        req.flash('error', "Unable to access article");
        return res.redirect('back');
    }
    // Double check that deleter is article author
    if(!(await article.sender._id.equals(req.user._id))) { 
        req.flash('error', "You can only delete articles that you have posted");
        return res.redirect('back');
    }

    // delete any uploads attached to article
    let cloudErr;
    let cloudResult;
    for (let file of article.mediaFiles) {
        if (file && file.filename) {
            // Evaluate deleted files' filetype and delete accordingly
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

             if (cloudErr || !cloudResult || cloudResult.result !== 'ok') { // Check For Failure
                req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
        }
    }
    // delete article database record
    const deletedArticle = await ArticleLink.findByIdAndDelete(article._id);
    if (!deletedArticle) {
        req.flash('error', "Unable to delete article");
        return res.redirect('back');
    }

    req.flash('success', 'Article Deleted!');
    return res.redirect('/articles/');
}

// GET: Specific information by site
controller.specificInfo = async function(req, res) {
    const platform = await setup(Platform);
    return res.render('other/specific-info', {platform, description: platform.features[objectArrIndex(platform.features, "route", "articles/specific-info")].description});
}

// GET: Help and Donation Options
controller.donate = async function(req, res) {
    const platform = await setup(Platform);
    return res.render('other/donate', {platform, description: platform.features[objectArrIndex(platform.features, "route", "articles/donate")].description, objectArrIndex});
}

// POST: Send advice through donation forum
controller.advice = async function(req, res) {
    const platform = await setup(Platform);
    if (platform.originalEmail != '') {
        let images = [];
        let pdfs = [];
        let text = req.body.message;

        // if files were attached, upload them
        if (req.files) {
            if (req.files.mediaFile) {
                let cloudErr;
                let cloudResult;
                for (let file of req.files.mediaFile) { // Upload each file to cloudinary
                    // attempt to compress
                    const processedBuffer = await autoCompress(file.originalname, file.buffer);
                    // upload to Cloudinary
                    [cloudErr, cloudResult] = await cloudUpload(file.originalname, processedBuffer);
                    if (cloudErr || !cloudResult) {
                        req.flash('error', 'Upload failed');
                        return res.redirect('back');
                    }
                    if (await [".png", ".jpg"].includes(path.extname(await cloudResult.url.split("SaberChat/")[1]))) {
                        await images.push(cloudResult.url);
                    }
                    else {
                        await pdfs.push({url: cloudResult.secure_url, name: file.originalname});
                    }
                }
            }
        }

        for (let file of images) {text += `<br><img src="${file}" style="width: 50%; height: 50%;>`;}
        for (let file of pdfs) {text += `<iframe src="${file.url}" height="300" width="250"></iframe><a href="${file.url}" target="_blank"><h5>Open ${file.originalname} New Tab?</h5></a>`;}
        // send Email
        await sendGridEmail(platform.officialEmail, `New Advice Donation From ${req.user.firstName} ${req.user.lastName} - ${req.body.subject}`, text, false);
        req.flash("success", "Thank you for sending us your advice!");
        return res.redirect("/articles/donate");
    }
    req.flash("error", `${platform.name} Saberchat does not have an official email set up yet`);
    return res.redirect("back");
}

module.exports = controller; // export controller object