// Backend validation for schemas

// Import schema blueprints
const {annSchema} = require('../joiValidation/announcement');
const {projectSchema} = require('../joiValidation/project');
const {chatSchema} = require('../joiValidation/chat');
const {msgSchema} = require('../joiValidation/message');
const {courseSchema} = require('../joiValidation/course');
const user = require('../joiValidation/user');

// Validate POST request body data based on schema
const handleValidation = function(schema, req, res, next) {
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
module.exports.validateAnn = function(req, res, next) {
    handleValidation(annSchema, req, res, next);
};

// Projects
module.exports.validateProject = function(req, res, next) {
    handleValidation(projectSchema, req, res, next);
};

// Inbox messages
module.exports.validateMsg = function(req, res, next) {
    handleValidation(msgSchema, req, res, next);
};

// Courses
module.exports.validateCourse = function(req, res, next) {
    handleValidation(courseSchema, req, res, next);
};

// Chat room
module.exports.validateRoom = function(req, res, next) {
    handleValidation(chatSchema, req, res, next);
};

// Users and profiles
module.exports.validatePasswordReset = function(req, res, next) {
    handleValidation(user.resetPasswordSchema, req, res, next);
};

// new User creation form
module.exports.validateNewUser = function(req, res, next) {
    handleValidation(user.newUserSchema, req, res, next);
};

// Login form
module.exports.validateUserLogin = function(req, res, next) {
    handleValidation(user.loginUserSchema, req, res, next);
};

// Update profile form
module.exports.validateUserUpdate = function(req, res, next) {
    handleValidation(user.updateUserSchema, req, res, next);
};

// Change email form
module.exports.validateEmailUpdate = function(req, res, next) {
    handleValidation(user.updateEmailSchema, req, res, next);
};

// Change password form
module.exports.validatePasswordUpdate = function(req, res, next) {
    handleValidation(user.updatePasswordSchema, req, res, next);
};
