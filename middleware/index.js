// Executes before the code in HTTP route request
middlewareObj = {};

middlewareObj.isLoggedIn = function(req, res, next) {
    if(req.isAuthenticated()) {
      return next();
    }
    req.flash('error', 'Please Login');
    res.redirect('/');
}

module.exports = middlewareObj;
