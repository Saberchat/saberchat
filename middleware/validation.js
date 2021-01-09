const { annSchema, newUserSchema, userLoginSchema } = require('../joiValidation/schemas');

const handleValidation = (schema, req, res, next) => {
    const { error } = schema.validate(req.body);

    if(error) {
        const errMsg = error.details.map(err => err.message).join(' ');
        req.flash('error', errMsg);
        res.redirect('back');
    } else {
        next();
    }
};

module.exports.validateAnn = (req, res, next) => {
    handleValidation(annSchema, req, res, next);
};

module.exports.validateNewUser = (req, res, next) => {
    handleValidation(newUserSchema, req, res, next);
};

module.exports.validateUserLogin = (req, res, next) => {
    handleValidation(userLoginSchema, req, res, next);
};