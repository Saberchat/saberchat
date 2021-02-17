//Project routes dictate the posting, viewing, and editing of the Saberchat Student Projects Board

//LIBRARIES
const express = require('express');
const middleware = require('../middleware');
const router = express.Router(); //start express router
const dateFormat = require('dateformat');
const path = require('path');
const {sendGridEmail} = require("../services/sendGrid");
const {convertToLink} = require("../utils/convert-to-link");
const {filter} = require('../utils/filter');
const {sortByPopularity} = require("../utils/popularity-algorithms");

const {multipleUpload} = require('../middleware/multer');
const {cloudUpload, cloudDelete} = require('../services/cloudinary');
const {validateProject} = require('../middleware/validation');

const wrapAsync = require('../utils/wrapAsync');
const controller = require('../controllers/projects');

router.route('/')
    .get(wrapAsync(controller.index))
    .post(middleware.isLoggedIn, middleware.isFaculty, multipleUpload, validateProject, wrapAsync(controller.createProject));

router.get('/new', middleware.isLoggedIn, middleware.isFaculty, wrapAsync(controller.newProject));

router.route('/:id')
    .get(wrapAsync(controller.showProject))
    .put(middleware.isLoggedIn, middleware.isFaculty, multipleUpload, wrapAsync(controller.updateProject))
    .delete(middleware.isLoggedIn, middleware.isFaculty, wrapAsync(controller.deleteProject));

router.get('/:id/edit', middleware.isLoggedIn, middleware.isFaculty, wrapAsync(controller.editProject));

router.put('/like', middleware.isLoggedIn, wrapAsync(controller.likeProject));

router.put('/comment', middleware.isLoggedIn, wrapAsync(controller.postComment));

router.put('/like-comment', middleware.isLoggedIn, wrapAsync(controller.likeComment));

//COMMENTED OUT FOR NOW, UNTIL WE MAKE FURTHER DECISIONS AT MEETING

// router.get('/data', middleware.isLoggedIn, middleware.isFaculty, (req, res) => {
//     Project.find({poster: req.user._id}).populate("comments").exec((err, projects) => {;
//         if (err || !projects) {
//             req.flash('error', "Unable to find projects");
//             return res.redirect('back');
//         }
//
//         const popularProjects = sortByPopularity(projects, "likes", "created_at", null).popular; //Extract and sort popular projects
//         const unpopularProjects = sortByPopularity(projects, "likes", "created_at", null).unpopular; //Extract and sort unpopular projects
//
//         //Build string of projects and comments text
//         let popularProjectText = "";
//         let popularCommentText = "";
//         for (let project of popularProjects) {
//             popularProjectText += `${project.title} ${project.text} `;
//             for (let comment of project.comments) {
//                 popularCommentText += `${comment.text} `;
//             }
//         }
//
//         //Build string of projects and comments text
//         let unpopularProjectText = "";
//         let unpopularCommentText = "";
//         for (let project of unpopularProjects) {
//             unpopularProjectText += `${project.title} ${project.text} `;
//             for (let comment of project.comments) {
//                 unpopularCommentText += `${comment.text} `;
//             }
//         }
//
//         //Map keywords from popular projects and their comments
//         const projectKeywords = filter(popularProjectText, unpopularProjectText);
//         const commentKeywords = filter(popularCommentText, unpopularCommentText);
//         res.render('projects/data', {popularProjects, projectKeywords, commentKeywords});
//     });
// });

module.exports = router;
