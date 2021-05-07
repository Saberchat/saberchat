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
    const users = await User.find({});
    let articles;
    if (req.user && platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission)) {
        articles = await ArticleLink.find({}).populate('sender');
    } else {
        articles = await ArticleLink.find({verified: true}).populate('sender');
    }

    if(!platform || !users || !articles) {req.flash('error', 'Cannot find articles.'); return res.redirect('back');}

    const userNames = await parsePropertyArray(users, "firstName").join(',').toLowerCase().split(',');
    const articleTexts = await embedLink(req.user, articles, userNames);

    return res.render('articles/index', {
        platform, articles: articles.reverse(), 
        data: platform.features[objectArrIndex(platform.features, "route", "articles")],
        articleTexts
    });
};

// Article GET new article
controller.new = async function(req, res) {
    const platform = await setup(Platform);
    if (!platform) {
        await req.flash("error", "An error occurred");
        return res.redirect("back");
    }
    return res.render('articles/new', {platform, data: platform.features[objectArrIndex(platform.features, "route", "articles")]});
};

// Article GET show
controller.show = async function(req, res) {
    const platform = await setup(Platform);
    const article = await ArticleLink.findById(req.params.id)
        .populate('sender')
        .populate({
            path: "comments",
            populate: {path: "sender"}
        });
    if(!platform || !article) {
        await req.flash('error', 'Could not find article'); return res.redirect('back');
    } else if (!article.verified && !platform.permissionsProperty.slice(platform.permissionsProperty.length-3).includes(req.user.permission)) {
        await req.flash('error', 'You cannot view that article');
        return res.redirect('back');
    }

    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of article.mediaFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    const convertedText = convertToLink(article.text); //Parse and add hrefs to all links in text
    return res.render('articles/show', {platform, article, convertedText, fileExtensions, data: platform.features[objectArrIndex(platform.features, "route", "articles")]});
};

// Article GET edit form
controller.updateForm = async function(req, res) {
    const platform = await setup(Platform);
    const article = await ArticleLink.findById(req.params.id);
    if(!platform || !article) {req.flash('error', 'Could not find article'); return res.redirect('back');}
    if(!article.sender._id.equals(req.user._id)) {
        await req.flash('error', 'You do not have permission to do that.');
        return res.redirect('back');
    }

    let fileExtensions = new Map(); //Track which file format each attachment is in
    for (let media of article.mediaFiles) {
        fileExtensions.set(media.url, path.extname(media.url.split("SaberChat/")[1]));
    }
    return res.render('articles/edit', {platform, article, fileExtensions, data: platform.features[objectArrIndex(platform.features, "route", "articles")]});
};

// Article POST create
controller.create = async function(req, res) {
    const platform = await setup(Platform);
    const article = await ArticleLink.create({ //Build article with error info
        sender: req.user,
        subject: req.body.subject,
        text: req.body.message,
        verified: !platform.postVerifiable //Article does not need to be verified if platform does not support verifying articles
    });
    if (!platform || !article) {
        await req.flash('error', 'Unable to create article');
        return res.redirect('back');
    }
    for (let attr of ["images", "links"]) {if (req.body[attr]) {article[attr] = req.body[attr];}}//Add images and links

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

    article.date = dateFormat(article.created_at, "h:MM TT | mmm d");
    await article.save();

    if (platform.postVerifiable) {
        await req.flash('success', `Article Posted! A ${platform.permissionsDisplay[platform.permissionsDisplay.length-1].toLowerCase()} will verify your post soon.`);
    } else {
        await req.flash('success', `Article Posted!`);
    }
    return res.redirect(`/articles`);
};

controller.verify = async function(req, res) {
    const article = await ArticleLink.findByIdAndUpdate(req.params.id, {verified: true});
    if (!article) {
        await req.flash('error', "Unable to access article");
        return res.redirect('back');
    }

    await req.flash("success", "Verified Article!");
    return res.redirect("/articles");
}

controller.updateArticle = async function(req, res) {
    const platform = await setup(Platform);
    const article = await ArticleLink.findById(req.params.id).populate('sender');
    if (!platform || !article) {
        await req.flash('error', "Unable to access article");
        return res.redirect('back');
    }

    if (article.sender._id.toString() != req.user._id.toString()) {
        await req.flash('error', "You can only update articles which you have sent");
        return res.redirect('back');
    }

    const updatedArticle = await ArticleLink.findByIdAndUpdate(req.params.id, {
        subject: req.body.subject,
        text: req.body.message,
        verified: !platform.postVerifiable //Article does not need to be verified if platform does not support verifying articles
    });
    if (!updatedArticle) {
        await req.flash('error', "Unable to update article");
        return res.redirect('back');
    }
    for (let attr of ["images", "links"]) {if (req.body[attr]) {updatedArticle[attr] = req.body[attr];}}

    //Iterate through all selected media to remove and delete them
    let cloudErr;
    let cloudResult;
    for (let i = updatedArticle.mediaFiles.length-1; i >= 0; i--) {
        if (req.body[`deleteUpload-${updatedArticle.mediaFiles[i].url}`] && updatedArticle.mediaFiles[i] && updatedArticle.mediaFiles[i].filename) {
            if ([".mp3", ".mp4", ".m4a", ".mov"].includes(path.extname(updatedArticle.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase())) {
                [cloudErr, cloudResult] = await cloudDelete(updatedArticle.mediaFiles[i].filename, "video");
            } else if (path.extname(updatedArticle.mediaFiles[i].url.split("SaberChat/")[1]).toLowerCase() == ".pdf") {
                [cloudErr, cloudResult] = await cloudDelete(updatedArticle.mediaFiles[i].filename, "pdf");
            } else {
                [cloudErr, cloudResult] = await cloudDelete(updatedArticle.mediaFiles[i].filename, "image");
            }
            // check for failure
            if (cloudErr || !cloudResult || cloudResult.result !== 'ok') {
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
        text: req.body.text.split('<').join('&lt'),
        sender: req.user
    });
    if (!comment) {
        return res.json({error: 'Error commenting'});
    }

    comment.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
    await comment.save();

    await article.comments.push(comment);
    await article.save();

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
        comments: article.comments
    });
}

// Article PUT like comment
controller.likeComment = async function(req, res) {
    const comment = await PostComment.findById(req.body.commentId);
    if(!comment) {return res.json({error: 'Error finding comment'});}

    if (await removeIfIncluded(comment.likes, req.user._id)) { //Remove Like
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

controller.deleteArticle = async function(req, res) {
    const article = await ArticleLink.findById(req.params.id).populate('sender');
    if (!article) {
        await req.flash('error', "Unable to access article");
        return res.redirect('back');
    }

    if (article.sender._id.toString() != req.user._id.toString()) { //Doublecheck that deleter is articleer
        await req.flash('error', "You can only delete articles that you have posted");
        return res.redirect('back');
    }

    // delete any uploads
    let cloudErr;
    let cloudResult;
    for (let file of article.mediaFiles) {
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
                await req.flash('error', 'Error deleting uploaded image');
                return res.redirect('back');
            }
        }
    }

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
    return res.render('other/specific-info', {platform, description: platform.features[objectArrIndex(platform.features, "route", "articles/specific-info")].description});
}

controller.donate = async function(req, res) {
    const platform = await setup(Platform);
    return res.render('other/donate', {platform, description: platform.features[objectArrIndex(platform.features, "route", "articles/donate")].description, objectArrIndex});
}

controller.advice = async function(req, res) {
    const platform = await setup(Platform);
    if (platform.originalEmail != '') {
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
                    if ([".png", ".jpg"].includes(path.extname(cloudResult.url.split("SaberChat/")[1]))) {images.push(cloudResult.url);}
                    else { pdfs.push({url: cloudResult.secure_url, name: file.originalname});}
                }
            }
        }

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