// Media upload middleware for Multi-part POST form data
// Saves files in memory to be uploaded to Cloudinary for example

const {uploadSingle, uploadMultiple} = require('../services/multer');

// Single document upload
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

// Multiple upload
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
