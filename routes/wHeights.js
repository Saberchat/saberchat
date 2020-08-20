const express = require('express');
const router = express.Router();
const middleware = require('../middleware');

router.get('/', function(req, res) {
    res.render('wHeights/index', {articles: [0,1,2,3,4,5,6,7,8,9]});
});

router.get('/articles/new', function(req, res) {
    res.render('wHeights/new');
});

router.post('/articles/new', middleware.isLoggedIn, function(req, res) {
    if(req.body.title) {
        console.log('received new!');
        console.log(req.body);
    }
    res.render('wHeights/index', {articles: [0,1,2,3,4,5,6,7,8,9]});
});

module.exports = router;