//Project routes dictate the posting, viewing, and editing of the Saberchat Projects Board
const express = require('express');
const middleware = require('../middleware');
const {multipleUpload} = require('../middleware/multer');
const {validateProject} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const projects = require('../controllers/projects'); //Controller
const router = express.Router(); //Router

router.route('/')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(projects.index)) //Show all projects
    .post(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), multipleUpload, validateProject, wrapAsync(projects.createProject)); //Create new project

router.get('/new', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), wrapAsync(projects.newProject)); //Form to create new project
router.get('/verify/:id', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.isFaculty), wrapAsync(projects.verify)); //Verify Project
// router.get('/data', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), wrapAsync(projects.data));

router.put('/like', wrapAsync(middleware.isLoggedIn), wrapAsync(projects.likeProject)); //Like project
router.put('/comment', wrapAsync(middleware.isLoggedIn), wrapAsync(projects.comment)); //Comment on project
router.put('/like-comment', wrapAsync(middleware.isLoggedIn), wrapAsync(projects.likeComment)); //Like a comment on project

router.route('/:id')
    .get(wrapAsync(middleware.isLoggedIn), wrapAsync(projects.showProject)) //Show specific project
    .put(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), multipleUpload, wrapAsync(projects.updateProject)) //Update specific project
    .delete(wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), wrapAsync(projects.deleteProject)); //Delete specific project

router.get('/:id/edit', wrapAsync(middleware.isLoggedIn), wrapAsync(middleware.postPermission), wrapAsync(projects.editProject)); //Form to edit project

module.exports = router;