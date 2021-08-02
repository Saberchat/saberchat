//Puzzles routes dictate the posting, viewing, and answering of Saberchat puzzles

//LIBRARIES
const express = require('express');
const middleware = require('../middleware/index');
const {multipleUpload} = require('../middleware/multer');
const {validateAnn} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const puzzles = require('../controllers/puzzles'); // Controller
const router = express.Router(); //Router

//ROUTES
router.route('/')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(puzzles.index)) //Show all puzzles
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), multipleUpload, validateAnn, wrapAsync(puzzles.create)); //Create puzzle

router.get('/new', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), wrapAsync(puzzles.new)); //Form to create new puzzle
router.get('/verify/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isMod), wrapAsync(puzzles.verify)); //Verify Puzzle

router.put('/like', wrapAsync(middleware.isLoggedIn), wrapAsync(puzzles.likePuzzle)); //Like puzzle
router.put('/like-comment', wrapAsync(middleware.isLoggedIn), wrapAsync(puzzles.likeComment)); //Comment on puzzle
router.put('/comment', wrapAsync(middleware.isLoggedIn), wrapAsync(puzzles.comment)); //Like a comment on puzzle
router.put('/answer/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(puzzles.answer)); //Answer a puzzle question

router.route('/:id')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(puzzles.show)) //Show specific puzzle
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), multipleUpload, wrapAsync(puzzles.updatePuzzle)) //Update specific puzzle
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), wrapAsync(puzzles.deletePuzzle)); //Delete specific puzzle

router.get('/:id/edit', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), wrapAsync(puzzles.updateForm)); //Form to edit specific puzzle

module.exports = router;