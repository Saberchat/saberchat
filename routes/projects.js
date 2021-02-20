//Project routes dictate the posting, viewing, and editing of the Saberchat Student Projects Board
const express = require('express');
const middleware = require('../middleware');
const {multipleUpload} = require('../middleware/multer');
const {validateProject} = require('../middleware/validation');
const {validatePostComment} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const projects = require('../controllers/projects'); //Controller
const router = express.Router(); //Router

router.route('/')
    .get(wrapAsync(projects.index))
    .post(middleware.isLoggedIn, middleware.isFaculty, multipleUpload, validateProject, wrapAsync(projects.createProject));

router.get('/new', middleware.isLoggedIn, middleware.isFaculty, wrapAsync(projects.newProject));
// router.get('/data', middleware.isLoggedIn, middleware.isFaculty, wrapAsync(projects.data));

router.put('/like', middleware.isLoggedIn, wrapAsync(projects.likeProject));
router.put('/comment', middleware.isLoggedIn, validatePostComment, wrapAsync(projects.comment));
router.put('/like-comment', middleware.isLoggedIn, wrapAsync(projects.likeComment));

router.route('/:id')
    .get(wrapAsync(projects.showProject))
    .put(middleware.isLoggedIn, middleware.isFaculty, multipleUpload, wrapAsync(projects.updateProject))
    .delete(middleware.isLoggedIn, middleware.isFaculty, wrapAsync(projects.deleteProject));

router.get('/:id/edit', middleware.isLoggedIn, middleware.isFaculty, wrapAsync(projects.editProject));

module.exports = router;