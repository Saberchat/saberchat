// Executes before the code in HTTP route request

//create a 'middleware' object to store middleware functions
middlewareObj = {};

//create isLoggedIn function to check if user is logged in
middlewareObj.isLoggedIn = function(req, res, next) {
	//authenticate user
	if(req.isAuthenticated()) {
		//stop the function by returning and proceed to next step
		return next();
	}
	//user is not logged in. Give flash message and redirect to root
	req.flash('error', 'Please Log In');
	res.redirect('/');
}

middlewareObj.checkUserMatch = function(req, res, next) {
	//check if user is logged in
	if(req.isAuthenticated()) {
		//check if the profile that is being edited matches the current user
		if(req.user._id == req.params.id) {
			next();
		} else {
			// else give error message
			req.flash('error', "You don't have permission to do that!");
			res.redirect('/');
		}
	} else {
		// else give error message
		req.flash('error', 'Please Login');
		res.redirect('/')
	}
}

//export the object with all the functions
module.exports = middlewareObj;
