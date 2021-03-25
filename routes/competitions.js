//Competition routes dictate the process of posting to the error bulletin

//LIBRARIES
const express = require('express');
const middleware = require('../middleware/index');
const {multipleUpload} = require('../middleware/multer');
const wrapAsync = require('../utils/wrapAsync');
const competitions = require('../controllers/competitions'); // Controller
const router = express.Router(); //Router

//ROUTES
router.route('/')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(competitions.index)) //Show all competitions
    .post(wrapAsync(middleware.isLoggedIn), multipleUpload, wrapAsync(competitions.create)); //Create competition

router.get('/new', wrapAsync(middleware.isLoggedIn), wrapAsync(competitions.new)); //Form to create new competition

router.put('/like', wrapAsync(middleware.isLoggedIn), wrapAsync(competitions.likeCompetition)); //Like competition
router.put('/like-comment', wrapAsync(middleware.isLoggedIn), wrapAsync(competitions.likeComment)); //Comment on competition
router.put('/comment', wrapAsync(middleware.isLoggedIn), wrapAsync(competitions.comment)); //Like comment on competition

router.route('/:id')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(competitions.show)) //Show specific competition
    .put(wrapAsync(middleware.isLoggedIn), multipleUpload, wrapAsync(competitions.updateCompetition)) //Update specific competition
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(competitions.deleteCompetition)); //Delete specific competition

router.get('/:id/edit', wrapAsync(middleware.isLoggedIn), wrapAsync(competitions.updateForm)); //Form to edit specific competition

module.exports = router;