const express = require('express');
const router = express.Router();
const middleware = require('../middleware');

const Article = require('../models/article');

// index page
router.get('/', function(req, res) {
    Article.find({}, function(err, foundArticles) {
        if(err) {
            req.flash('error', 'Cannot access Database');
            res.redirect('/witherlyheights');
        } else {
            res.render('wHeights/index', {articles: foundArticles});
        }
    });
});

// display specific article
router.get('/articles/:id', function(req, res) {
    Article.findById(req.params.id, function(err, foundArticle) {
        if(err) {
            req.flash('error', 'Cannot find article');
            res.redirect('/witherlyheights');
        } else {
            res.render('wHeights/show', {article: foundArticle});
        }
    });
});

// display form for creating articles
router.get('/articles/new', function(req, res) {
    res.render('wHeights/new');
});

// create articles
router.post('/articles/new', function(req, res) {
    const content = JSON.parse(req.body.content);
    const articleObj = {
        title: req.body.title,
        author: req.body.author,
        content: content
    };
    Article.create(articleObj, function(err, article) {
        if(err) {
            console.log(err);
        } else {
            res.redirect('/witherlyheights');
        }
    });
});

module.exports = router;