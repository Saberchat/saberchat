//LIBRARIES
const dateFormat = require('dateformat');
const sendGridEmail = require("../services/sendGrid");
const convertToLink = require("../utils/convert-to-link");

//SCHEMA
const Article = require('../models/article');
const User = require('../models/user');
const Type = require('../models/articleType');
const PostComment = require('../models/postComment');

// index page
module.exports.index = async function(req, res) {
    const articles = await Article.find({}).populate('author');
    if (!articles) {
        req.flash('error', 'An Error Occurred');
        return res.redirect('/articles');
    }
    return res.render('wHeights/index', {articles});
}

// display form for creating articles
module.exports.new = async function(req, res) {
    const students = await User.find({
        authenticated: true,
        status: {$in: ["7th", "8th", "9th", "10th", "11th", "12th"]}
    });
    if (!students) {
        req.flash('error', "Unable to find students");
        return res.redirect('back');
    }

    const types = await Type.find({});
    if (!types) {
        req.flash('error', "Unable to find article types");
        return res.redirect('back');
    }

    return res.render('wHeights/new', {students, types});
}

// display specific article
module.exports.show = async function(req, res) {
    const article = await Article.findById(req.params.id)
        .populate('author')
        .populate({
            path: 'comments',
            populate: {
                path: 'sender'
            }
        });

    if (!article) {
        req.flash('error', 'Cannot find article');
        return res.redirect('/articles');
    }

    return res.render('wHeights/show', {
        article: article,
        date: dateFormat(article.created_at, "mmm d, yyyy - h:MM TT")
    });
}

//Create article
module.exports.create = async function(req, res) {
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

    type.articles.push(article);
    await type.save();

    return res.redirect('/articles');
}

//Comment on article
module.exports.comment = async function(req, res) {
    const article = await Article.findById(req.body.article)
        .populate({
            path: "comments",
            populate: {
                path: "sender"
            }
        });

    if (!article) {
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

    article.comments.push(comment);
    await article.save();

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

module.exports.likeComment = async function(req, res) {
    const comment = await PostComment.findById(req.body.commentId);
    if (!comment) {
        return res.json({error: 'Error updating comment'});
    }

    if (comment.likes.includes(req.user._id)) { //Remove Like
        comment.likes.splice(comment.likes.indexOf(req.user._id), 1);
        await comment.save();
        return res.json({
            success: `Removed a like from a comment`,
            likeCount: comment.likes.length
        });

    } else { //Add Like
        comment.likes.push(req.user._id);
        await comment.save();

        return res.json({
            success: `Liked comment`,
            likeCount: comment.likes.length
        });
    }
}
