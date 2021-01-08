const {annSchema} = require('../joiValidation/schemas');

module.exports.validateAnn = (req, res, next) => {
    const { error } = annSchema.validate(req.body);

    if(error) {
        const errMsg = error.details.map(err => err.message).join('\n');
        req.flash('error', errMsg);
        res.redirect('back');
    } else {
        next();
    }
};