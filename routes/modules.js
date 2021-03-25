//Module routes dictate the process of posting to the error bulletin

//LIBRARIES
const express = require('express');
const middleware = require('../middleware/index');
const {multipleUpload} = require('../middleware/multer');
const wrapAsync = require('../utils/wrapAsync');
const modules = require('../controllers/modules'); // Controller
const router = express.Router(); //Router

//ROUTES
router.route('/')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(modules.index)) //Show all modules
    .post(wrapAsync(middleware.isLoggedIn), multipleUpload, wrapAsync(modules.create)); //Create module

router.get('/new', wrapAsync(middleware.isLoggedIn), wrapAsync(modules.new)); //Form to create new module

router.put('/like', wrapAsync(middleware.isLoggedIn), wrapAsync(modules.likeModule)); //Like module
router.put('/like-comment', wrapAsync(middleware.isLoggedIn), wrapAsync(modules.likeComment)); //Comment on module
router.put('/comment', wrapAsync(middleware.isLoggedIn), wrapAsync(modules.comment)); //Like comment on module

router.route('/:id')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(modules.show)) //Show specific module
    .put(wrapAsync(middleware.isLoggedIn), multipleUpload, wrapAsync(modules.updateModule)) //Update specific module
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(modules.deleteModule)); //Delete specific module

router.get('/:id/edit', wrapAsync(middleware.isLoggedIn), wrapAsync(modules.updateForm)); //Form to edit specific module

module.exports = router;