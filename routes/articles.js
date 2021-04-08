//Article routes dictate the process of posting to the error bulletin

//LIBRARIES
const express = require('express');
const middleware = require('../middleware/index');
const {multipleUpload} = require('../middleware/multer');
const wrapAsync = require('../utils/wrapAsync');
const articles = require('../controllers/articles'); // Controller
const router = express.Router(); //Router

//ROUTES
router.route('/')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(articles.index)) //Show all articles
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), multipleUpload, wrapAsync(articles.create)); //Create article

router.get('/new', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(articles.new)); //Form to create new article
router.get('/specific-info', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(articles.specificInfo)); //Specific information by site
router.put('/like', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(articles.likeArticle)); //Like article
router.put('/like-comment', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(articles.likeComment)); //Comment on article
router.put('/comment', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(articles.comment)); //Like comment on article

router.route('/:id')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(articles.show)) //Show specific article
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), multipleUpload, wrapAsync(articles.updateArticle)) //Update specific article
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(articles.deleteArticle)); //Delete specific article

router.get('/:id/edit', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(articles.updateForm)); //Form to edit specific article

module.exports = router;