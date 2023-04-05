// Article routes dictate the process of posting to the error bulletin

//LIBRARIES
const express = require('express');
const middleware = require('../middleware/index'); // general middleware
const {multipleUpload} = require('../middleware/multer'); // media uploading
const wrapAsync = require('../utils/wrapAsync'); // utility for handling async functions
const articles = require('../controllers/articles'); // Controller
const router = express.Router(); // Router

//ROUTES

// root
router.route('/')
    //Show all articles
    .get(wrapAsync(middleware.accessToFeature), wrapAsync(articles.index)) 
    //Create article
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), multipleUpload, wrapAsync(articles.create)); 

// Form to create new article
router.get('/new', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(articles.new)); 
// Specific information by site
router.get('/specific-info', wrapAsync(middleware.accessToFeature), wrapAsync(articles.specificInfo)); 
// Help and Donation Options
router.get('/donate', wrapAsync(middleware.accessToFeature), wrapAsync(articles.donate)); 

// Like article
router.put('/like', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(articles.likeArticle)); 
// Comment on article
router.put('/like-comment', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(articles.likeComment)); 
// Like comment on article
router.put('/comment', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(articles.comment)); 
// Verify Article
router.get('/verify/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isMod), wrapAsync(articles.verify)); 

// Send advice through donation forum
router.post('/advice', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), multipleUpload, wrapAsync(articles.advice)); 

// :ID
router.route('/:id')
    // Show specific article
    .get(wrapAsync(middleware.accessToFeature), wrapAsync(articles.show)) 
    // Update specific article
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), multipleUpload, wrapAsync(articles.updateArticle)) 
    // Delete specific article
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(articles.deleteArticle)); 

// Form to edit specific article
router.get('/:id/edit', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.accessToFeature), wrapAsync(articles.updateForm)); 

module.exports = router;