const multerUpload = require('../services/multer');

module.exports = (req, res, next) => {
     multerUpload(req, res, (err) => {
        if(err) {
            req.flash('error', err.message);
            res.redirect('back');
        } else {
            next();
        }
     });
};