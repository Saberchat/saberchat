//LIBRARIES
const express = require('express');
const router = express.Router();
const middleware = require('../middleware');
const dateFormat = require('dateformat');
const {transport, transport_mandatory} = require("../transport");

//SCHEMA
const Article = require('../models/article');
const User = require('../models/user');
const Type = require('../models/articleType');

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
    console.log(err);
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
    console.log(err);
    req.flash('error', "Unable to access database");
    res.redirect('back');
  })
});

// display specific article
router.get('/:id', middleware.isLoggedIn, (req, res) => {
    Article.findById(req.params.id).populate('author').exec((err, foundArticle) => {
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
    console.log(req.body);

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
    console.log(err);
    req.flash('error', "Unable to access database");
    res.redirect('back');
  });
});

module.exports = router;
