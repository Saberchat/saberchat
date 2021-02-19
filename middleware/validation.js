const {annSchema} = require('../joiValidation/announcement');
const {projectSchema} = require('../joiValidation/project');
const {chatSchema} = require('../joiValidation/chat');
const {msgSchema} = require('../joiValidation/message');
const {courseSchema} = require('../joiValidation/course');
const {postCommentSchema} = require('../joiValidation/postComment');
const user = require('../joiValidation/user');

const handleValidation = (schema, req, res, next) => {
    const {error} = schema.validate(req.body);
    if (error) {
        const errMsg = error.details.map(err => err.message).join(' ');
        req.flash('error', errMsg);
        res.redirect('back');
    } else {
        next();
    }
};

// Announcements
module.exports.validateAnn = (req, res, next) => {
    handleValidation(annSchema, req, res, next);
};

// Projects
module.exports.validateProject = (req, res, next) => {
    handleValidation(projectSchema, req, res, next);
};

// Inbox messages
module.exports.validateMsg = (req, res, next) => {
    handleValidation(msgSchema, req, res, next);
};

// Announcements
module.exports.validatePostComment = (req, res, next) => {
    handleValidation(postCommentSchema, req, res, next);
};

// Courses
module.exports.validateCourse = (req, res, next) => {
    handleValidation(courseSchema, req, res, next);
};

// Chat room
module.exports.validateRoom = (req, res, next) => {
    handleValidation(chatSchema, req, res, next);
};

// Users and profiles
module.exports.validatePasswordReset = (req, res, next) => {
    handleValidation(user.resetPasswordSchema, req, res, next);
};

module.exports.validateNewUser = (req, res, next) => {
    handleValidation(user.newUserSchema, req, res, next);
};

module.exports.validateUserLogin = (req, res, next) => {
    handleValidation(user.loginUserSchema, req, res, next);
};

module.exports.validateUserUpdate = (req, res, next) => {
    handleValidation(user.updateUserSchema, req, res, next);
};

module.exports.validateEmailUpdate = (req, res, next) => {
    handleValidation(user.updateEmailSchema, req, res, next);
};

module.exports.validatePasswordUpdate = (req, res, next) => {
    handleValidation(user.updatePasswordSchema, req, res, next);
};
