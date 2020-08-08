const   express = require('express'),
        router = express.Router();

router.get('/profile', function(req, res) {
    res.render('profile/index');
});

module.exports = router;