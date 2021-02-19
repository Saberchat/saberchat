//Project routes dictate the posting, viewing, and editing of the Saberchat Student Projects Board
const express = require('express');
const middleware = require('../middleware');
const {multipleUpload} = require('../middleware/multer');
const {validateProject} = require('../middleware/validation');
const {validatePostComment} = require('../middleware/validation');
const wrapAsync = require('../utils/wrapAsync');
const projects = require('../controllers/projects'); //Controller
module.exports = express.Router(); //Router

module.exports.route('/')
    .get(wrapAsync(projects.index))
    .post(middleware.isLoggedIn, middleware.isFaculty, multipleUpload, validateProject, wrapAsync(projects.createProject));

module.exports.get('/new', middleware.isLoggedIn, middleware.isFaculty, wrapAsync(projects.newProject));
// module.exports.get('/data', middleware.isLoggedIn, middleware.isFaculty, wrapAsync(projects.data));

module.exports.put('/like', middleware.isLoggedIn, wrapAsync(projects.likeProject));
module.exports.put('/comment', middleware.isLoggedIn, validatePostComment, wrapAsync(projects.comment));
module.exports.put('/like-comment', middleware.isLoggedIn, wrapAsync(projects.likeComment));

module.exports.route('/:id')
    .get(wrapAsync(projects.showProject))
    .put(middleware.isLoggedIn, middleware.isFaculty, multipleUpload, wrapAsync(projects.updateProject))
    .delete(middleware.isLoggedIn, middleware.isFaculty, wrapAsync(projects.deleteProject));

module.exports.get('/:id/edit', middleware.isLoggedIn, middleware.isFaculty, wrapAsync(projects.editProject));