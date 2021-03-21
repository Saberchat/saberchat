//LIBRARIES
const dateFormat = require('dateformat');
const {sendGridEmail} = require("../services/sendGrid");
const setup = require("../utils/setup");

//SCHEMA
const Platform = require("../models/platform");
const User = require('../models/user');
const {Article, PostComment} = require('../models/post');
const {PostOrg} = require('../models/group');
const {PostCategory} = require('../models/category');

const controller = {};

// index page
controller.index = async function(req, res) {
    const platform = await setup(Platform);
    const articles = await Article.find({}).populate('sender');
    if (!platform || !articles) {
        req.flash('error', 'An Error Occurred');
        return res.redirect('/articles');
    }
    return res.render('wHeights/index', {platform, articles});
}

// display form for creating articles
controller.new = async function(req, res) {
    const platform = await setup(Platform);
    const wHeightsOrg = await setup(PostOrg);

    const students = await User.find({
        authenticated: true,
        status: {$in: platform.studentStatuses} //All students
    });
    if (!platform || !wHeightsOrg || !students) {
        req.flash('error', "Unable to find students");
        return res.redirect('back');
    }

    const categories = await PostCategory.find({_id: {$in: wHeightsOrg.categories}}); //Find list of article categories (for sorting)
    if (!categories) {
        req.flash('error', "Unable to find article categories");
        return res.redirect('back');
    }

    return res.render('wHeights/new', {platform, students, categories});
}

// display specific article
controller.show = async function(req, res) {
    const platform = await setup(Platform);
    const article = await Article.findById(req.params.id)
        .populate('sender')
        .populate({
            path: 'comments',
            populate: {path: 'sender'}
        });

    if (!platform || !article) {
        req.flash('error', 'Cannot find article');
        return res.redirect('/articles');
    }
    return res.render('wHeights/show', {platform, article});
}

//Create article
controller.create = async function(req, res) {
    const content = JSON.parse(req.body.content);

    const articleObj = {
        title: req.body.title,
        content: content
    };

    const article = await Article.create(articleObj);
    if (!article) {
        req.flash('error', "Error creating article");
        return res.redirect('/articles');
    }
    article.date = dateFormat(article.created_at, "mmm d, yyyy - h:MM TT");

    const sender = await User.findById(req.body.sender);
    if (!sender) {
        req.flash('error', "Unable to find sender");
        return res.redirect('back');
    }

    article.sender = sender;
    await article.save();

    const category = await PostCategory.findById(req.body.category);
    if (!category) {
        req.flash('error', "Unable to find specified category");
        return res.redirect('back');
    }

    //Add articles to the article category
    category.articles.push(article);
    await category.save();
    return res.redirect('/articles');
}

//Comment on article
controller.comment = async function(req, res) {
    const article = await Article.findById(req.body.article)
        .populate({
            path: "comments",
            populate: {path: "sender"}
        });

    if (!article) {
        return res.json({error: 'Error commenting'});
    }

    const comment = await PostComment.create({
        text: req.body.text.split('<').join('&lt'),
        sender: req.user,
        date: dateFormat(new Date(), "h:MM TT | mmm d")
    });
    if (!comment) {
        return res.json({error: 'Error commenting'});
    }

    comment.date = dateFormat(comment.created_at, "h:MM TT | mmm d");
    await comment.save();

    article.comments.push(comment);
    await article.save();

    let users = [];
    let user;

    //Look for any mentioned users in comment text
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
        notif = await Notification.create({
            subject: `New Mention in ${article.title}`,
            sender: req.user,
            recipients: [user],
            read: [],
            toEveryone: false,
            images: []
        }); //Create a notification to alert the user

        if (!notif) {
            return res.json({error: "Error creating notification"});
        }

        notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
        notif.text = `Hello ${user.firstName},\n\n${req.user.firstName} ${req.user.lastName} mentioned you in a comment on "${article.title}":\n${comment.text}`;
        await notif.save();
        if (user.receiving_emails) {
            await sendGridEmail(user.email, `New Mention in ${article.title}`, `<p>Hello ${user.firstName},</p><p>${req.user.firstName} ${req.user.lastName} mentioned you in a comment on <strong>${article.title}</strong>.<p>${comment.text}</p>`, false);
        }

        user.inbox.push({message: notif, new: true}); //Add notif to user's inbox
        await user.save();
    }
    return res.json({success: 'Successful comment', comments: article.comments});
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
    comment.likes.push(req.user._id); //Add Like
    await comment.save();
    return res.json({
        success: `Liked comment`,
        likeCount: comment.likes.length
    });
}

module.exports = controller;