const express = require('express');
const router = express.Router();
const middleware = require('../middleware');

const Article = require('../models/article');
const Announcement = require('../models/announcement');

// index page
router.get('/', function(req, res) {
    Article.find({}, function(err, foundArticles) {
        if(err) {
            req.flash('error', 'Cannot access Database');
            res.redirect('/articles');
        } else {

          Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
            if (err || !foundAnns) {
              req.flash('error', 'Unable to access database')
              res.redirect('back')
            } else {
              res.render('wHeights/index', {articles: foundArticles, announcements: foundAnns, announced: false})
            }
          })
        }
    });
});

// display form for creating articles
router.get('/new', function(req, res) {
  Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
    if (err || !foundAnns) {
      req.flash('error', 'Unable to access database')
      res.redirect('back')
    } else {
      res.render('wHeights/new', {announcements: foundAnns, announced: false})
    }
  })
});

// display specific article
router.get('/:id', function(req, res) {
    Article.findById(req.params.id, function(err, foundArticle) {
        if(err) {
            req.flash('error', 'Cannot find article');
            res.redirect('/articles');
        } else {
          Announcement.find({}).populate({path: 'sender', select: ['username', 'imageUrl']}).populate('message').exec((err, foundAnns) => {
            if (err || !foundAnns) {
              req.flash('error', 'Unable to access database')
              res.redirect('back')
            } else {
              res.render('wHeights/show', {article: foundArticle, announcements: foundAnns, announced: false})
            }
          })
        }
    });
});

// create articles
router.post('/new', function(req, res) {
    const content = JSON.parse(req.body.content);
    const articleObj = {
        title: req.body.title,
        author: req.body.author,
        content: content
    };
    Article.create(articleObj, function(err, article) {
        if(err) {
            console.log(err);
            res.redirect('/articles')
        } else {
            res.redirect('/articles');
        }
    });
});

module.exports = router;
