//Project routes dictate the posting, viewing, and editing of the Saberchat Student Projects Board
const express = require('express');
const middleware = require('../middleware');
const {multipleUpload} = require('../middleware/multer');
const {validateProject} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const projects = require('../controllers/projects'); //Controller
const router = express.Router(); //Router

router.route('/')
    .get(middleware.isLoggedIn, wrapAsync(projects.index)) //Show all projects
    .post(middleware.isLoggedIn, middleware.isFaculty, multipleUpload, validateProject, wrapAsync(projects.createProject)); //Create ne wproject

router.get('/new', middleware.isLoggedIn, middleware.isFaculty, wrapAsync(projects.newProject)); //Form to create new project
// router.get('/data', middleware.isLoggedIn, middleware.isFaculty, wrapAsync(projects.data));

router.put('/like', middleware.isLoggedIn, wrapAsync(projects.likeProject)); //Like project
router.put('/comment', middleware.isLoggedIn, wrapAsync(projects.comment)); //Comment on project
router.put('/like-comment', middleware.isLoggedIn, wrapAsync(projects.likeComment)); //Like a comment on project

router.route('/:id')
    .get(wrapAsync(projects.showProject)) //Show specific project
    .put(middleware.isLoggedIn, middleware.isFaculty, multipleUpload, wrapAsync(projects.updateProject)) //Update specific project
    .delete(middleware.isLoggedIn, middleware.isFaculty, wrapAsync(projects.deleteProject)); //Delete specific project

router.get('/:id/edit', middleware.isLoggedIn, middleware.isFaculty, wrapAsync(projects.editProject)); //Form to edit project

module.exports = router;