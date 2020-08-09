const   express = require('express'),
        router = express.Router();

//renders views/profile/index.ejs at /profile route.
router.get('/profile', function(req, res) {
    res.render('profile/index');
});

module.exports = router;