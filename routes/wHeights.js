//LIBRARIES
const express = require('express');
const router = express.Router();
const middleware = require('../middleware');
const dateFormat = require('dateformat');
const {transport, transport_mandatory} = require("../transport");
const convertToLink = require("../convert-to-link");

//SCHEMA
const Article = require('../models/article');
const User = require('../models/user');
const Type = require('../models/articleType');
const PostComment = require('../models/postComment');

// index page
router.get('/', middleware.isLoggedIn, (req, res) => {
  (async() => {
    const articles = await Article.find({}).populate('author');
    if(!articles) {
      req.flash('error', 'Cannot access Database');
      res.redirect('/articles');
    }
    res.render('wHeights/index', {articles: articles});

  })().catch(err => {
    req.flash('error', "Unable to access database");
    res.redirect('back');
  });
});

// display form for creating articles
router.get('/new', middleware.isLoggedIn, (req, res) => {

  (async() => {

    const students = await User.find({authenticated: true, permission: 'student'});
    if (!students) {
      req.flash('error', "Unable to find students"); return res.redirect('back');
    }

    const types = await Type.find({});
    if (!types) {
      req.flash('error', "Unable to find article types"); return res.redirect('back');
    }

    res.render('wHeights/new', {students, types});

  })().catch(err => {
    req.flash('error', "Unable to access database");
    res.redirect('back');
  })
});

// display specific article
router.get('/:id', middleware.isLoggedIn, (req, res) => {
    Article.findById(req.params.id)
    .populate('author')
    .populate({
      path: 'comments',
      populate: {
        path: 'sender'
      }
    })
    .exec((err, foundArticle) => {
        if(err) {
            req.flash('error', 'Cannot find article');
            res.redirect('/articles');
        } else {
            res.render('wHeights/show', {article: foundArticle, date: dateFormat(foundArticle.created_at, "mmm d, yyyy - h:MM TT")});
        }
    });
});

// create articles
router.post('/new', middleware.isLoggedIn, (req, res) => {

  (async () => {

    const content = JSON.parse(req.body.content);

    const articleObj = {
        title: req.body.title,
        content: content
    };

    const article = await Article.create(articleObj);
    if (!article) {
      req.flash('error', "Error creating article"); return res.redirect('/articles');
    }

    const author = await User.findById(req.body.author);
    if (!author) {
      req.flash('error', "Unable to find author"); return res.redirect('back');
    }

    article.author = author;
    await article.save();

    const type = await Type.findById(req.body.type);
    if (!type) {
      req.flash('error', "Unable to find specified type"); return res.redirect('back');
    }

    type.articles.push(article);
    await type.save();

    res.redirect('/articles');

  })().catch(err => {
    req.flash('error', "Unable to access database");
    res.redirect('back');
  });
});

router.put('/comment', middleware.isLoggedIn, (req, res) => {
  (async() => {

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

    const comment = await PostComment.create({text: req.body.text, sender: req.user, date: dateFormat(new Date(), "h:MM TT | mmm d")});
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

      notif = await Notification.create({subject: `New Mention in ${article.title}`, sender: req.user, recipients: [user], read: [], toEveryone: false, images: []}); //Create a notification to alert the user

      if (!notif) {
        return res.json({error: "Error creating notification"});
      }

      notif.date = dateFormat(notif.created_at, "h:MM TT | mmm d");
      notif.text = `Hello ${user.firstName},\n\n${req.user.firstName} ${req.user.lastName} mentioned you in a comment on "${article.title}":\n${comment.text}`;

      await notif.save();

      transport(user, `New Mention in ${article.title}`, `<p>Hello ${user.firstName},</p><p>${req.user.firstName} ${req.user.lastName} mentioned you in a comment on <strong>${article.title}</strong>.<p>${comment.text}</p>`);

      user.inbox.push(notif); //Add notif to user's inbox
      user.msgCount += 1;
      await user.save();
    }

    res.json({success: 'Successful comment', comments: article.comments});

  })().catch(err => {
    res.json({error: "Error Commenting"});
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

module.exports = router;
