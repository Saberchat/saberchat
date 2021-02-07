module.exports = function(func) {
    return function(req, res, next) {
        func(req, res, next).catch(err => {
            // for when 404 and 500 is implemented.
            // next(err);

            // For now
            console.log(err);
            req.flash('error', 'Something went wrong.');
            res.redirect('back');
        });
    }
}
