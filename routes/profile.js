const   express = require('express'),
        router = express.Router();
        
const middleware = require('../middleware');

//renders views/profile/index.ejs at /profile route.
router.get('/profile', middleware.isLoggedIn, function(req, res) {
    res.render('profile/index');
});

module.exports = router;