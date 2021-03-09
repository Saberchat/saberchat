//LIBRARIES
const dateFormat = require('dateformat');
const {sendGridEmail} = require("../services/sendGrid");
const platformInfo = require("../platform-info");

//SCHEMA
const Article = require('../models/wHeights/article');
const User = require('../models/user');
const Type = require('../models/wHeights/articleType');
const PostComment = require('../models/postComment');

if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const controller = {};
const platform = platformInfo[process.env.PLATFORM];

// index page
controller.index = async function(req, res) {
    const articles = await Article.find({}).populate('author');
    if (!articles) {
        req.flash('error', 'An Error Occurred');
        return res.redirect('/articles');
    }
    return res.render('wHeights/index', {articles});
}

// display form for creating articles
controller.new = async function(req, res) {
    const students = await User.find({
        authenticated: true,
        status: {$in: ["7th", "8th", "9th", "10th", "11th", "12th"]} //All students
    });
    if (!students) {
        req.flash('error', "Unable to find students");
        return res.redirect('back');
    }

    const types = await Type.find({}); //Find list of article types (for sorting)
    if (!types) {
        req.flash('error', "Unable to find article types");
        return res.redirect('back');
    }

    return res.render('wHeights/new', {students, types});
}

// display specific article
controller.show = async function(req, res) {
    const article = await Article.findById(req.params.id)
        .populate('author')
        .populate({
            path: 'comments',
            populate: {path: 'sender'}
        });

    if (!article) {
        req.flash('error', 'Cannot find article');
        return res.redirect('/articles');
    }
    return res.render('wHeights/show', {article});
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

    const author = await User.findById(req.body.author);
    if (!author) {
        req.flash('error', "Unable to find author");
        return res.redirect('back');
    }

    article.author = author;
    await article.save();

    const type = await Type.findById(req.body.type);
    if (!type) {
        req.flash('error', "Unable to find specified type");
        return res.redirect('back');
    }

    //Add articles to the article category
    type.articles.push(article);
    await type.save();
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

        user.inbox.push(notif); //Add notif to user's inbox
        user.msgCount += 1;
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