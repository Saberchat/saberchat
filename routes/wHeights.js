const express = require('express');
const router = express.Router();


router.get('/', function(req, res) {
    res.render('wHeights/index', {articles: [0,1,2,3,4,5,6,7,8,9]});
});

module.exports = router;