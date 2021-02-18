const {uploadSingle, uploadMultiple} = require('../services/multer');

module.exports.singleUpload = function(req, res, next) {
    uploadSingle(req, res, (err) => {
        if (err) {
            req.flash('error', err.message);
            res.redirect('back');
        } else {
            next();
        }
    });
}

module.exports.multipleUpload = function(req, res, next) {
    uploadMultiple(req, res, (err) => {
        if (err) {
            req.flash('error', err.message);
            res.redirect('back');
        } else {
            next();
        }
    });
}
